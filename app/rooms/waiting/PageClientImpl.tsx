"use client";

import { ConnectionDetails } from "@/lib/types";
import { LocalUserChoices, PreJoin } from "@livekit/components-react";
import { VideoCodec } from "livekit-client";
import React, { useEffect, useState } from "react";
import { WaitingRoomComponent } from "./WaitingRoomComponent";
import { Input } from "antd";

const CONN_DETAILS_ENDPOINT =
  process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? "/api/connection-details";

export function PageClientImpl(props: {
  roomName: string;
  region?: string;
  hq: boolean;
  codec: VideoCodec;
}) {
  const [preJoinChoices, setPreJoinChoices] = React.useState<
    LocalUserChoices | undefined
  >({
    username: localStorage.getItem("username") ?? "username-not-found",
    videoEnabled: false,
    videoDeviceId: "xx",
    audioEnabled: false,
    audioDeviceId: "communications",
  });

  useEffect(() => {
    const getConnectionInfo = async () => {
      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
      url.searchParams.append("roomName", "waiting"); // props.roomName);
      url.searchParams.append(
        "participantName",
        localStorage.getItem("username") ?? "canh"
      );
      if (props.region) {
        url.searchParams.append("region", props.region);
      }
      const connectionDetailsResp = await fetch(url.toString());
      const connectionDetailsData = await connectionDetailsResp.json();

      console.log("connectionDetailsData: ", connectionDetailsData);
      setConnectionDetails(connectionDetailsData);
    };

    getConnectionInfo();
  }, []);

  const preJoinDefaults = React.useMemo(() => {
    return {
      username: "",
      videoEnabled: false, // true,
      audioEnabled: false, // true,
    };
  }, []);

  const [connectionDetails, setConnectionDetails] = React.useState<
    ConnectionDetails | undefined
  >(undefined);

  const handlePreJoinSubmit = React.useCallback(
    async (values: LocalUserChoices) => {
      // values.videoEnabled = false;
      console.log("LocalUserChoices: ", preJoinChoices);
      /// setPreJoinChoices(values);
      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
      url.searchParams.append("roomName", "waiting"); // props.roomName);
      url.searchParams.append("participantName", values.username);
      if (props.region) {
        url.searchParams.append("region", props.region);
      }
      const connectionDetailsResp = await fetch(url.toString());
      const connectionDetailsData = await connectionDetailsResp.json();

      console.log("connectionDetailsData: ", connectionDetailsData);
      setConnectionDetails(connectionDetailsData);
    },
    []
  );

  const handlePreJoinError = React.useCallback(
    (e: any) => console.error(e),
    []
  );

  const [role, setRole] = useState("");
  return (
    <main data-lk-theme="default">
      {/* style={{ height: "100%", width: "100%" }} */}
      {connectionDetails === undefined || preJoinChoices === undefined ? (
        <div
          style={{
            // display: "grid",
            placeItems: "center",
            height: "100%",
            width: "100%",
          }}
        >
          <PreJoin
            defaults={preJoinDefaults}
            onSubmit={handlePreJoinSubmit}
            onError={handlePreJoinError}
          />
          <Input
            style={{ margin: "auto", maxWidth: "150px" }}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="enter your role"
          />
        </div>
      ) : (
        <WaitingRoomComponent
          connectionDetails={connectionDetails}
          userChoices={preJoinChoices}
          options={{ codec: props.codec, hq: props.hq }}
        />
      )}
    </main>
  );
}
