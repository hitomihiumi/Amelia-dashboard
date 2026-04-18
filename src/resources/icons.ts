import { IconType } from "react-icons";

import {
  IoLogOut,
  IoChevronBack,
  IoFolderOpen,
  IoAdd,
  IoMic,
  IoGrid,
  IoCart,
  IoCard,
  IoMail,
  IoSettings,
  IoTerminal,
  IoAirplane, IoDiamond, IoTrailSign, IoTicket
} from "react-icons/io5";

import { FaDiscord } from "react-icons/fa";

export const iconLibrary: Record<string, IconType> = {
  discord: FaDiscord,
  gear: IoSettings,
  logout: IoLogOut,
  plus: IoAdd,
  back: IoChevronBack,
  boxes: IoGrid,
  command: IoTerminal,
  cart: IoCart,
  money: IoCard,
  microphone: IoMic,
  mail: IoMail,
  folder: IoFolderOpen,
  plane: IoAirplane,
  diamond: IoDiamond,
  sign: IoTrailSign,
  ticket: IoTicket,
};

export type IconLibrary = typeof iconLibrary;
export type IconName = keyof IconLibrary;
