import { IconType } from "react-icons";

import { HiOutlineRocketLaunch } from "react-icons/hi2";

import { IoLogOut, IoAddCircle, IoArrowBackCircle } from "react-icons/io5";

import { FaBoxesStacked, FaCartShopping, FaGear } from "react-icons/fa6";

import { FaDiscord, FaMoneyBill } from "react-icons/fa";
import { RiSlashCommands2 } from "react-icons/ri";

export const iconLibrary: Record<string, IconType> = {
  rocket: HiOutlineRocketLaunch,
  discord: FaDiscord,
  gear: FaGear,
  logout: IoLogOut,
  plus: IoAddCircle,
  back: IoArrowBackCircle,
  boxes: FaBoxesStacked,
  command: RiSlashCommands2,
  cart: FaCartShopping,
  money: FaMoneyBill,
};

export type IconLibrary = typeof iconLibrary;
export type IconName = keyof IconLibrary;
