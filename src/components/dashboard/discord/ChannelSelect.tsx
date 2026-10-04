"use client";

import React from "react";
import { type SelectProps, SelectReact } from "@/components/user/SelectReact";
import { useT } from "@/i18n/client";

export interface ChannelSelectProps extends SelectProps {
  selectedChannel: string | string[];
  setSelectedChannel: (channel: string | string[] | any) => void;
  multiple?: boolean;
}

export const ChannelSelect: React.FC<ChannelSelectProps> = ({
  selectedChannel,
  setSelectedChannel,
  id,
  placement,
  label,
  options,
  multiple = false,
  // Servers have dozens of channels and roles, so searching is the default.
  searchable = true,
  placeholder,
  ...rest
}) => {
  const t = useT();
  const fallbackPlaceholder = multiple
    ? t("common.select.selectChannels")
    : t("common.select.selectChannel");

  return (
    <SelectReact
      id={id}
      label={label}
      onSelect={(value) => setSelectedChannel(value)}
      value={selectedChannel}
      placement={placement}
      options={options}
      multiple={multiple}
      searchable={searchable}
      placeholder={placeholder ?? fallbackPlaceholder}
      {...rest}
    />
  );
};
