"use client";

import React from "react";

import { type SelectProps, SelectReact } from "@/components/user/SelectReact";

export interface ChannelSelectProps extends SelectProps {
  selectedChannel: string;
  setSelectedChannel: (channel: string) => void;
}

export const ChannelSelect: React.FC<ChannelSelectProps> = ({
  selectedChannel,
  setSelectedChannel,
  id,
  placement,
  label,
  options,
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
      {...rest}
    />
  );
};
