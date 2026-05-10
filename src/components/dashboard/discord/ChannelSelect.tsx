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
      {...rest}
    />
  );
};
