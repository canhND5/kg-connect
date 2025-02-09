import { Room } from "livekit-client";
import Router from "next/router";

export const denyConnect = async (currentRoom: Room, roomId: string, participantIdentity: string) => {
    const data = {
      type: "DENY_CONNECT",
      roomId,
    };
    await currentRoom.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(data)),
      {
        reliable: true,
        destinationIdentities: [participantIdentity],
      }
    );
  };

export  const acceptConnect = async (currentRoom: Room, roomId: string, participantIdentity: string) => {
    const data = {
      type: "ACCEPT_CONNECT",
      roomId,
    };
    await currentRoom.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(data)),
      {
        reliable: true,
        destinationIdentities: [participantIdentity],
      }
    );
    Router.push(`/rooms/${roomId}`);
  };