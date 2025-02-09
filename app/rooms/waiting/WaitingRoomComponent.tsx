"use client";

import ChatSection from "@/components/ChatSection/ChatSection";
import { decodePassphrase, generateRoomId } from "@/lib/client-utils";
import { ConnectionDetails } from "@/lib/types";
import { acceptConnect, denyConnect } from "@/stores/waitingRoom";
import {
  LiveKitRoom,
  LocalUserChoices,
  AudioConference,
  StartAudio,
} from "@livekit/components-react";
import { Modal, notification } from "antd";
import {
  ExternalE2EEKeyProvider,
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  DeviceUnsupportedError,
  RoomConnectOptions,
  Participant,
  ParticipantEvent,
  RemoteParticipant,
} from "livekit-client";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export function WaitingRoomComponent(props: {
  userChoices: LocalUserChoices;
  connectionDetails: ConnectionDetails;
  options: {
    hq: boolean;
    codec: VideoCodec;
  };
}) {
  const e2eePassphrase =
    typeof window !== "undefined" &&
    decodePassphrase(location.hash.substring(1));

  const worker =
    typeof window !== "undefined" &&
    e2eePassphrase &&
    new Worker(new URL("livekit-client/e2ee-worker", import.meta.url));

  const e2eeEnabled = !!(e2eePassphrase && worker);
  const keyProvider = new ExternalE2EEKeyProvider();
  const [e2eeSetupComplete, setE2eeSetupComplete] = React.useState(false);
  const [participants, setParticipants] = React.useState<Participant[]>([]);

  const roomOptions = React.useMemo((): RoomOptions => {
    let videoCodec: VideoCodec | undefined = props.options.codec
      ? props.options.codec
      : "vp9";
    if (e2eeEnabled && (videoCodec === "av1" || videoCodec === "vp9")) {
      videoCodec = undefined;
    }
    return {
      videoCaptureDefaults: {
        deviceId: props.userChoices.videoDeviceId ?? undefined,
        resolution: props.options.hq ? VideoPresets.h2160 : VideoPresets.h720,
      },
      publishDefaults: {
        dtx: false,
        videoSimulcastLayers: props.options.hq
          ? [VideoPresets.h1080, VideoPresets.h720]
          : [VideoPresets.h540, VideoPresets.h216],
        red: !e2eeEnabled,
        videoCodec,
      },
      audioCaptureDefaults: {
        deviceId: props.userChoices.audioDeviceId ?? undefined,
      },
      adaptiveStream: { pixelDensity: "screen" },
      dynacast: true,
      e2ee: e2eeEnabled
        ? {
            keyProvider,
            worker,
          }
        : undefined,
    };
  }, [props.userChoices, props.options.hq, props.options.codec]);

  const room = React.useMemo(() => new Room(roomOptions), []);
  console.log("room: ", room);
  const participant = room.localParticipant;
  participant.metadata = JSON.stringify({
    role: "moderator",
    customField: "yourCustomData",
  });

  // const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const [notify, contextHolder] = notification.useNotification();

  const participantDataReceive = (
    payload: Uint8Array,
    participant?: RemoteParticipant
  ) => {
    const strData = decoder.decode(payload);
    const { type, roomId } = JSON.parse(strData);
    if (type == "REQUEST_CONNECT") {
      console.log("REQUEST_CONNECT: ", strData);

      setRequestParticipant(participant);
      setRequestRoomId(roomId);
      setIsOpenModal(true);

      return;
    }

    if (type == "ACCEPT_CONNECT") {
      console.log("ACCEPT_CONNECT: ", strData);
      notify.success({
        message: `${participant?.name} accepted your connect request!! `,
        duration: 0,
      });
      setTimeout(() => router.push(`/rooms/${roomId}`), 1000);

      return;
    }

    if (type == "DENY_CONNECT") {
      console.log("DENY_CONNECT: ", strData);
      notify.warning({
        message: `${participant?.name} deny your connect request!! `,
        duration: 0,
      });

      return;
    }
  };

  // const denyConnect = async (roomId: string, participantIdentity: string) => {
  //   const data = {
  //     type: "DENY_CONNECT",
  //     roomId,
  //   };
  //   await room.localParticipant.publishData(
  //     new TextEncoder().encode(JSON.stringify(data)),
  //     {
  //       reliable: true,
  //       destinationIdentities: [participantIdentity],
  //     }
  //   );
  // };

  // const acceptConnect = async (roomId: string, participantIdentity: string) => {
  //   const data = {
  //     type: "ACCEPT_CONNECT",
  //     roomId,
  //   };
  //   await room.localParticipant.publishData(
  //     new TextEncoder().encode(JSON.stringify(data)),
  //     {
  //       reliable: true,
  //       destinationIdentities: [participantIdentity],
  //     }
  //   );
  //   router.push(`/rooms/${roomId}`);
  // };

  const updateParticipants = () => {
    // Bao gồm cả local participant và remote participants
    const allParticipants = [
      // room.localParticipant,
      ...Array.from(room.remoteParticipants.values()),
    ];
    console.log("allParticipants: ", allParticipants);
    setParticipants(allParticipants);
  };

  useEffect(() => {
    // Cập nhật danh sách ban đầu
    updateParticipants();

    // Receive data from other participants
    room.on(ParticipantEvent.DataReceived, participantDataReceive);

    // Lắng nghe sự kiện khi participant tham gia hoặc rời phòng
    room.on("participantConnected", updateParticipants);
    room.on("participantDisconnected", updateParticipants);

    return () => {
      room.off("participantConnected", updateParticipants);
      room.off("participantConnected", updateParticipants);
      room.off(ParticipantEvent.DataReceived, participantDataReceive);
    };
  }, []);

  React.useEffect(() => {
    if (e2eeEnabled) {
      keyProvider
        .setKey(decodePassphrase(e2eePassphrase))
        .then(() => {
          room.setE2EEEnabled(true).catch((e) => {
            if (e instanceof DeviceUnsupportedError) {
              alert(
                `You're trying to join an encrypted meeting, but your browser does not support it. Please update it to the latest version and try again.`
              );
              console.error(e);
            } else {
              throw e;
            }
          });
        })
        .then(() => setE2eeSetupComplete(true));
    } else {
      setE2eeSetupComplete(true);
    }
  }, [e2eeEnabled, room, e2eePassphrase]);

  const connectOptions = React.useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  const router = useRouter();
  const handleOnLeave = React.useCallback(
    () => router.push("/rooms/waiting"),
    [router]
  );
  const handleError = React.useCallback((error: Error) => {
    console.error(error);
    alert(
      `Encountered an unexpected error, check the console logs for details: ${error.message}`
    );
  }, []);
  const handleEncryptionError = React.useCallback((error: Error) => {
    console.error(error);
    alert(
      `Encountered an unexpected encryption error, check the console logs for details: ${error.message}`
    );
  }, []);

  const [requestParticipant, setRequestParticipant] = useState<
    Participant | undefined
  >(undefined);
  const [requestRoomId, setRequestRoomId] = useState("");
  const [isOpenModal, setIsOpenModal] = useState(false);
  const handleOk = () => {
    acceptConnect(room, requestRoomId, requestParticipant?.identity || "");
    setIsOpenModal(false);
  };

  const handleCancel = () => {
    denyConnect(room, requestRoomId, requestParticipant?.identity || "");
    setIsOpenModal(false);
  };

  const [openChat, setOpenChat] = useState<boolean>(false);
  const [sendToUsername, setSendToUsername] = useState("");
  return (
    <>
      {contextHolder}
      <Modal
        open={isOpenModal}
        title="Title"
        onOk={handleOk}
        onCancel={handleCancel}
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            <CancelBtn />
            <OkBtn />
          </>
        )}
      >
        {requestParticipant?.name} want to connect to you?
      </Modal>
      <div>
        <h3>
          Participants in Room:
          <button onClick={updateParticipants}>Refresh</button>
        </h3>
        <ul>
          {participants.map((p) => (
            <li key={p.name}>
              {p.name + " "}
              <button
                onClick={() => {
                  const data = {
                    type: "REQUEST_CONNECT",
                    roomId: generateRoomId(),
                  };
                  room.localParticipant.publishData(
                    new TextEncoder().encode(JSON.stringify(data)),
                    {
                      reliable: true,
                      destinationIdentities: [p.identity],
                    }
                  );
                }}
              >
                {"📞"}
              </button>
              /
              <button
                onClick={() => {
                  setOpenChat(!openChat);
                  setSendToUsername(p.identity);
                }}
              >
                {"📝"}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <LiveKitRoom
        connect={e2eeSetupComplete}
        room={room}
        token={props.connectionDetails.participantToken}
        serverUrl={props.connectionDetails.serverUrl}
        connectOptions={connectOptions}
        video={props.userChoices.videoEnabled}
        audio={props.userChoices.audioEnabled}
        onDisconnected={handleOnLeave}
        onEncryptionError={handleEncryptionError}
        onError={handleError}
      >
        <StartAudio label="Click to allow audio playback" />

        <AudioConference />
        {/* <DebugMode /> */}
        {/* <RecordingIndicator /> */}
      </LiveKitRoom>
      <ChatSection
        open={openChat}
        sendTo={sendToUsername}
        onclose={() => setOpenChat(false)}
      />
    </>
  );
}
