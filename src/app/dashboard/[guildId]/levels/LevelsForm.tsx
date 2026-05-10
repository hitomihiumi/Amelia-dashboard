'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {Flex, Text, Input, Column, Row, Switch, IconButton, Button, useToast, Line} from '@once-ui-system/core';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { updateLevelsSettings } from './actions';
import { ChannelSelect } from "@/components/dashboard/discord/ChannelSelect";
import { RoleSelect } from "@/components/dashboard/discord/RoleSelect";
import { useRouter } from 'next/navigation';
import type { GuildSchema } from "@/lib/db/types";
import { ChannelPickOption } from "@/lib/discord/channel-type";
import { DiscordRole } from "@/lib/discord/role-style";
import { RolePill } from "@/components/dashboard/discord/RolePill";
import {ChannelPill} from "@/components/dashboard/discord/ChannelPill";
import {GuildActionState} from "@/types/dashboard";

export function LevelsForm({
                               guildId,
                               defaultLevels,
                               defaultEconomy,
                               textChannels,
                               voiceChannels,
                               roles
                           }: {
    guildId: string,
    defaultLevels: GuildSchema['utils']['levels'],
    defaultEconomy: GuildSchema['economy']['income']['level_up'],
    textChannels: ChannelPickOption[],
    voiceChannels: ChannelPickOption[],
    roles: DiscordRole[]
}) {
    const router = useRouter();
    const { addToast } = useToast();
    const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

    const [levels, setLevels] = useState(defaultLevels);
    const [economy, setEconomy] = useState(defaultEconomy);
    const [baseline, setBaseline] = useState({ levels: defaultLevels, economy: defaultEconomy });

    const [newLevel, setNewLevel] = useState<string>('');
    const [newRoleId, setNewRoleId] = useState<string>('');

    const isDirty = useMemo(() =>
            JSON.stringify(levels) !== JSON.stringify(baseline.levels) ||
            JSON.stringify(economy) !== JSON.stringify(baseline.economy),
        [levels, economy, baseline]);

    useEffect(() => { setIsDirty(isDirty); }, [isDirty, setIsDirty]);

    const handleSave = useCallback(async () => {
        const fd = new FormData();
        fd.set('levels', JSON.stringify(levels));
        fd.set('economy', JSON.stringify(economy));

        const result: GuildActionState = await updateLevelsSettings(guildId, fd);
        if (!result) {
            addToast({ variant: "danger", message: "No response from server" });
            return;
        }
        if (result.ok) {
            setBaseline({ levels, economy });
            addToast({ message: "Settings saved successfully", variant: "success" });
            router.refresh();
        } else {
            addToast({ message: result.error || "Save failed", variant: "danger" });
        }
    }, [guildId, levels, economy, router, addToast]);

    const handleCancel = useCallback(() => {
        setLevels(baseline.levels);
        setEconomy(baseline.economy);
    }, [baseline]);

    useEffect(() => {
        setSaveAction(handleSave);
        setCancelAction(handleCancel);
        return () => { setSaveAction(null); setCancelAction(null); };
    }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

    const addRoleReward = () => {
        const lvl = parseInt(newLevel);
        if (isNaN(lvl) || lvl <= 0 || !newRoleId) return;

        setLevels(prev => ({
            ...prev,
            level_roles: { ...prev.level_roles, [lvl]: newRoleId }
        }));
        setNewLevel('');
        setNewRoleId('');
    };

    const removeRoleReward = (lvl: string) => {
        const updatedRoles = { ...levels.level_roles };
        delete updatedRoles[parseInt(lvl)];
        setLevels(prev => ({ ...prev, level_roles: updatedRoles }));
    };

    const roleOptions = useMemo(() => roles.map(r => ({
        label: <RolePill roleColor={r.color} label={r.name} />,
        value: r.id
    })), [roles]);

    const channelOptions = useMemo(() => textChannels.map(c => ({
        label: <ChannelPill channel={c}/>,
        value: c.id
    })), [textChannels]);

    const allChannelOptions = useMemo(() => [...textChannels, ...voiceChannels].map((channel) => ({
        label: <ChannelPill channel={channel}/>,
        value: channel.id
    })), [textChannels, voiceChannels]);

    return (
        <Flex direction="column" gap="24">
            <Flex direction="column" gap="16" padding="24" border="neutral-weak" radius="l" background="surface">
                <Row horizontal="between" vertical="center">
                    <Column>
                        <Text variant="body-strong-m">Enable Module</Text>
                        <Text variant="body-default-xs" onBackground="neutral-weak">Toggle the entire leveling and XP system.</Text>
                    </Column>
                    <Switch isChecked={levels.enabled} onToggle={() => setLevels(p => ({ ...p, enabled: !p.enabled }))} />
                </Row>
            </Flex>

            <Flex direction="column" gap="16" padding="24" border="neutral-weak" radius="l" background="surface">
                <Text variant="body-strong-l">Role Rewards</Text>
                <Text variant="body-default-s" onBackground="neutral-weak">Roles automatically granted to users when they reach a specific level.</Text>

                <Column gap="8">
                    {Object.entries(levels.level_roles).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([lvl, rId]) => {
                        const role = roles.find(r => r.id === rId);
                        return (
                            <Row key={lvl} horizontal="between" vertical="center" padding="12" background="overlay" radius="m" border="neutral-alpha-medium">
                                <Row gap="16" vertical="center">
                                    <Flex width="48"><Text variant="body-strong-m">Lv. {lvl}</Text></Flex>
                                    <RolePill roleColor={role?.color || 0} label={role?.name || "Unknown Role"} />
                                </Row>
                                <IconButton icon="close" variant="tertiary" size="s" onClick={() => removeRoleReward(lvl)} />
                            </Row>
                        );
                    })}
                </Column>

                <Line />

                <Row gap="12" vertical="center" s={{ direction: "column" }}>
                    <Column fillWidth>
                        <Input
                            id="new-reward-level"
                            value={newLevel}
                            onChange={(e) => setNewLevel(e.target.value)}
                            placeholder="5"
                            label={'Level'}
                        />
                    </Column>
                    <RoleSelect
                        fillWidth
                        id="new-reward-role"
                        options={roleOptions}
                        selectedRole={newRoleId}
                        setSelectedRole={(val) => setNewRoleId(val as string)}
                        label={'Role to grant'}
                    />
                    <Button variant="primary" onClick={addRoleReward} disabled={!newLevel || !newRoleId}>Add</Button>
                </Row>
            </Flex>

            <Flex direction="column" gap="16" padding="24" border="neutral-weak" radius="l" background="surface">
                <Text variant="body-strong-l">Announcements</Text>
                <Row horizontal="between" vertical="center">
                    <Text variant="body-default-m">Send level-up message</Text>
                    <Switch isChecked={levels.message.enabled} onToggle={() => setLevels(p => ({ ...p, message: { ...p.message, enabled: !p.message.enabled } }))} />
                </Row>
                <Column gap="12">
                    <ChannelSelect
                        label={"Announcement Channel"}
                        id="level-up-channel"
                        options={channelOptions}
                        selectedChannel={levels.message.channel || ''}
                        setSelectedChannel={(val) => setLevels(p => ({ ...p, message: { ...p.message, channel: val as string || null } }))}
                    />
                    <Input
                        id="msg-delete-delay"
                        label="Auto-delete delay (seconds, 0 to keep)"
                        value={levels.message.delete}
                        onChange={(e) => setLevels(p => ({ ...p, message: { ...p.message, delete: Number(e.target.value) } }))}
                    />
                </Column>
            </Flex>

            <Flex direction="column" gap="16" padding="24" border="neutral-weak" radius="l" background="surface">
                <Text variant="body-strong-l">Restrictions</Text>
                <Column gap="12">
                    <ChannelSelect
                        label={'Ignored Channels'}
                        id="ignored-channels"
                        multiple
                        options={allChannelOptions}
                        selectedChannel={levels.ignore_channels}
                        setSelectedChannel={(val) => setLevels(p => ({ ...p, ignore_channels: val as string[] }))}
                    />
                </Column>
                <Column gap="12">
                    <RoleSelect
                        label={'Ignored Roles'}
                        id="ignored-roles"
                        multiple
                        options={roleOptions}
                        selectedRole={levels.ignore_roles}
                        setSelectedRole={(val) => setLevels(p => ({ ...p, ignore_roles: val as string[] }))}
                    />
                </Column>
            </Flex>

            <Flex direction="column" gap="16" padding="24" border="neutral-weak" radius="l" background="surface">
                <Text variant="body-strong-l">Economy Integration</Text>
                <Row horizontal="between" vertical="center">
                    <Column>
                        <Text variant="body-strong-m">Cash Reward</Text>
                        <Text variant="body-default-xs" onBackground="neutral-weak">Give currency to users upon leveling up.</Text>
                    </Column>
                    <Switch isChecked={economy.enabled} onToggle={() => setEconomy(p => ({ ...p, enabled: !p.enabled }))} />
                </Row>
                <Input
                    id="eco-reward-amount"
                    label="Reward Amount"
                    value={economy.amount}
                    onChange={(e) => setEconomy(p => ({ ...p, amount: Number(e.target.value) }))}
                />
            </Flex>
        </Flex>
    );
}