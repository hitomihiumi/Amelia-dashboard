import type { IconName as CoreIconName } from "@once-ui-system/core";
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
  IoAirplane,
  IoDiamond,
  IoTrailSign,
  IoTicket,
  IoRocket,
  IoRibbon,
  IoGitNetwork,
  IoColorPalette,
  IoPerson,
  IoBonfire,
  IoSend,
  IoTrophy,
  IoEyeOff,
  IoLink,
  IoDocumentAttach,
  IoList,
  IoRemove,
  IoText,
  IoTrash,
  IoCubeOutline,
  IoToggleOutline,
  IoDocumentTextOutline,
  IoLayersOutline,
  IoListOutline,
  IoChatbubbleEllipsesOutline,
  IoPeopleOutline,
  IoMegaphoneOutline,
  IoMailOutline,
  IoPricetagOutline,
  IoChatbubblesOutline,
  IoCreateOutline,
  IoArrowRedoOutline,
  IoPlayForwardOutline,
  IoPlayOutline,
  IoChatboxEllipsesOutline,
  IoTrashOutline,
  IoShieldOutline,
  IoPersonAddOutline,
  IoClipboardOutline,
  IoVolumeHigh,
  IoMegaphone,
  IoRadio,
  IoArrowBackOutline,
  IoCartOutline,
  IoFileTrayFullOutline,
  IoGitNetworkOutline,
  IoSendOutline,
  IoMicOutline,
  IoOptionsOutline,
  IoRibbonOutline,
  IoShieldCheckmarkOutline,
  IoTerminalOutline,
  IoWalletOutline,
  IoHomeOutline,
  IoNewspaperOutline,
  IoSettingsOutline,
  IoShieldHalfOutline,
  IoSpeedometerOutline,
  IoWarningOutline,
  IoServerOutline,
} from "react-icons/io5";

import { FaDiscord, FaGithub, FaHashtag } from "react-icons/fa";

export const iconLibrary = {
  discord: FaDiscord,
  github: FaGithub,
  hash: FaHashtag,
  speaker: IoVolumeHigh,
  megaphone: IoMegaphone,
  stage: IoRadio,
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
  rocket: IoRocket,
  ribbon: IoRibbon,
  gitnet: IoGitNetwork,
  palette: IoColorPalette,
  user: IoPerson,
  bonfire: IoBonfire,
  send: IoSend,
  trophy: IoTrophy,
  eyeoff: IoEyeOff,
  link: IoLink,
  documentattach: IoDocumentAttach,
  list: IoList,
  minus: IoRemove,
  text: IoText,
  trash: IoTrash,
  target: IoCubeOutline,
  cube: IoCubeOutline,
  buttonIcon: IoToggleOutline,
  modalIcon: IoDocumentTextOutline,
  embedIcon: IoLayersOutline,
  selectIcon: IoListOutline,
  actionModal: IoCreateOutline,
  actionMessage: IoChatbubbleEllipsesOutline,
  actionEmbed: IoLayersOutline,
  actionRoleAdd: IoPeopleOutline,
  actionRoleRemove: IoPeopleOutline,
  actionThread: IoChatbubblesOutline,
  actionDm: IoMailOutline,
  actionVar: IoPricetagOutline,
  actionEdit: IoCreateOutline,
  actionDelete: IoTrashOutline,
  actionReply: IoChatboxEllipsesOutline,
  actionBroadcast: IoMegaphoneOutline,
  trigger: IoPlayForwardOutline,
  play: IoPlayOutline,
  redo: IoArrowRedoOutline,
  shield: IoShieldOutline,
  invite: IoPersonAddOutline,
  clipboard: IoClipboardOutline,
  // Dashboard navigation: one outline set, so every row has the same visual weight.
  navGeneral: IoOptionsOutline,
  navCommands: IoTerminalOutline,
  navModeration: IoShieldCheckmarkOutline,
  navForms: IoClipboardOutline,
  navQueue: IoFileTrayFullOutline,
  navCases: IoListOutline,
  navAudit: IoDocumentTextOutline,
  navEconomy: IoWalletOutline,
  navShop: IoCartOutline,
  navLevels: IoRibbonOutline,
  navPrivate: IoMicOutline,
  navComponents: IoToggleOutline,
  navScenarios: IoGitNetworkOutline,
  navSend: IoSendOutline,
  navBack: IoArrowBackOutline,
  navOverview: IoSpeedometerOutline,
  navNews: IoNewspaperOutline,
  navIncidents: IoWarningOutline,
  navLogs: IoTerminalOutline,
  navServers: IoServerOutline,
  navSiteSettings: IoSettingsOutline,
  navAdminPanel: IoShieldHalfOutline,
  navHome: IoHomeOutline,
} satisfies Record<string, IconType>;

declare module "@once-ui-system/core" {
  interface IconLibraryOverrides {
    discord: true;
    github: true;
    hash: true;
    speaker: true;
    megaphone: true;
    stage: true;
    gear: true;
    logout: true;
    plus: true;
    back: true;
    boxes: true;
    command: true;
    cart: true;
    money: true;
    microphone: true;
    mail: true;
    folder: true;
    plane: true;
    diamond: true;
    sign: true;
    ticket: true;
    rocket: true;
    ribbon: true;
    gitnet: true;
    palette: true;
    user: true;
    bonfire: true;
    send: true;
    trophy: true;
    eyeoff: true;
    link: true;
    documentattach: true;
    list: true;
    minus: true;
    text: true;
    trash: true;
    target: true;
    cube: true;
    buttonIcon: true;
    modalIcon: true;
    embedIcon: true;
    selectIcon: true;
    actionModal: true;
    actionMessage: true;
    actionEmbed: true;
    actionRoleAdd: true;
    actionRoleRemove: true;
    actionThread: true;
    actionDm: true;
    actionVar: true;
    actionEdit: true;
    actionDelete: true;
    actionReply: true;
    actionBroadcast: true;
    trigger: true;
    play: true;
    redo: true;
    shield: true;
    invite: true;
    clipboard: true;
    navGeneral: true;
    navCommands: true;
    navModeration: true;
    navForms: true;
    navQueue: true;
    navCases: true;
    navAudit: true;
    navEconomy: true;
    navShop: true;
    navLevels: true;
    navPrivate: true;
    navComponents: true;
    navScenarios: true;
    navSend: true;
    navBack: true;
    navOverview: true;
    navNews: true;
    navIncidents: true;
    navLogs: true;
    navServers: true;
    navSiteSettings: true;
    navAdminPanel: true;
    navHome: true;
  }
}

export type IconLibrary = typeof iconLibrary;
/** Every icon the site can render: the built-ins plus the registered ones above. */
export type IconName = CoreIconName;
