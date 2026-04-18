import 'server-only';

const DISCORD_API = 'https://discord.com/api/v10';

const CATEGORY_NAME = 'Join To Create';
const TRIGGER_VOICE_NAME = 'Join To Create';

const CHANNEL_TYPE_CATEGORY = 4;
const CHANNEL_TYPE_VOICE = 2;

function sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function discordFetch(
    url: string,
    init: RequestInit,
    maxRetries = 6,
): Promise<Response> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await fetch(url, { ...init, cache: 'no-store' });
        if (res.status !== 429) return res;
        let waitMs = 800;
        const h = res.headers.get('retry-after');
        if (h) waitMs = Math.max(Number(h) * 1000, 100);
        else {
            try {
                const j = (await res.json()) as { retry_after?: number };
                if (typeof j.retry_after === 'number') {
                    waitMs = Math.ceil(j.retry_after * 1000) + 100;
                }
            } catch {
                waitMs = 500;
            }
        }
        if (attempt >= maxRetries) return res;
        await sleep(waitMs);
    }
    return fetch(url, { ...init, cache: 'no-store' });
}

type ApiChannel = {
    id: string;
    name: string;
    type: number;
    parent_id?: string | null;
};

async function getGuildChannels(
    botToken: string,
    guildId: string,
): Promise<ApiChannel[] | { error: string }> {
    const res = await discordFetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
        headers: {
            Authorization: `Bot ${botToken}`,
            'User-Agent': 'AmeliaDashboard/1.0',
        },
    });
    if (!res.ok) {
        const t = await res.text();
        return {
            error: `Cannot fetch channels from Discord (${res.status}): ${t.slice(0, 200)}`,
        };
    }
    return (await res.json()) as ApiChannel[];
}

async function createGuildChannel(
    botToken: string,
    guildId: string,
    body: Record<string, unknown>,
    auditReason: string,
): Promise<ApiChannel | { error: string }> {
    const res = await discordFetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
        method: 'POST',
        headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'AmeliaDashboard/1.0',
            'X-Audit-Log-Reason': encodeURIComponent(auditReason).slice(0, 512),
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const t = await res.text();
        return {
            error: `Cannot create channel in Discord (${res.status}): ${t.slice(0, 200)}`,
        };
    }
    return (await res.json()) as ApiChannel;
}

export async function discordAutoSetupTempVoice(
    guildId: string,
): Promise<
    | { ok: true; categoryId: string; triggerChannelId: string }
    | { ok: false; error: string }
> {
    const bot = process.env.DISCORD_BOT_TOKEN?.trim();
    if (!bot) {
        return {
            ok: false,
            error:
                'DISCORD_BOT_TOKEN is not configured. Please set it in the environment variables.',
        };
    }

    let channels = await getGuildChannels(bot, guildId);
    if (!Array.isArray(channels)) {
        return { ok: false, error: channels.error };
    }

    let category = channels.find(
        (c) => c.type === CHANNEL_TYPE_CATEGORY && c.name === CATEGORY_NAME,
    );

    if (!category) {
        const created = await createGuildChannel(
            bot,
            guildId,
            {
                name: CATEGORY_NAME,
                type: CHANNEL_TYPE_CATEGORY,
            },
            'Auto-setup for temporary voice channels (dashboard)',
        );
        if ('error' in created) {
            return { ok: false, error: created.error };
        }
        category = created;
        channels = await getGuildChannels(bot, guildId);
        if (!Array.isArray(channels)) {
            return { ok: false, error: channels.error };
        }
    }

    let trigger = channels.find(
        (c) =>
            c.type === CHANNEL_TYPE_VOICE &&
            c.name === TRIGGER_VOICE_NAME &&
            c.parent_id === category.id,
    );

    if (!trigger) {
        const created = await createGuildChannel(
            bot,
            guildId,
            {
                name: TRIGGER_VOICE_NAME,
                type: CHANNEL_TYPE_VOICE,
                parent_id: category.id,
            },
            'Auto-setup for temporary voice channels (dashboard)',
        );
        if ('error' in created) {
            return { ok: false, error: created.error };
        }
        trigger = created;
    }

    return {
        ok: true,
        categoryId: category.id,
        triggerChannelId: trigger.id,
    };
}