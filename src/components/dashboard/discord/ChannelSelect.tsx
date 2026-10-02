"use client";

import React from "react";
import { type SelectProps, SelectReact } from "@/components/user/SelectReact";

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
  placeholder = multiple ? "Select channels" : "Select a channel",
  ...rest
}) => {
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
      placeholder={placeholder}
      {...rest}
    />
  );
};
