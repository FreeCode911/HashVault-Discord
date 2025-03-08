const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const asciichart = require("asciichart"); // Import the charting library

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const WALLET_ADDRESS =
  "43Yv5u7V93FdhZuJj9pNghX1mEUE9EzmTQUqPM8F3AJpPbAf2zBkAVeVYzePqDA1MbMPki7u29iwoBNuVikn66cQQLPWd7U";
const API_URL = `https://api.hashvault.pro/v3/monero/wallet/${WALLET_ADDRESS}/stats?chart=total&inactivityThreshold=10&order=name&period=daily&poolType=false&workers=true`;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

let messageId = null;

// Function to format hash rate
function formatHashRate(hashRate) {
  if (hashRate >= 1e9) return `${(hashRate / 1e9).toFixed(2)} GH/s`;
  if (hashRate >= 1e6) return `${(hashRate / 1e6).toFixed(2)} MH/s`;
  if (hashRate >= 1e3) return `${(hashRate / 1e3).toFixed(2)} kH/s`;
  return `${hashRate} H/s`;
}

async function fetchMiningStats() {
  try {
    const { data } = await axios.get(API_URL);

    const collective = data.collective;
    const revenue = data.revenue;
    const workers = data.collectiveWorkers || [];

    // Convert confirmed balance to XMR
    const confirmedBalanceXMR = revenue.confirmedBalance
      ? (revenue.confirmedBalance / 1e12).toFixed(8)
      : "0.00000000";

    // Worker Summary
    const workerSummary = workers.length
      ? "```Worker   | ⚡ Hash Rate | ✅ Shares | ⚠️ Stale \n" +
        "───────────|────────────|──────────|────────\n" +
        workers
          .map(
            (worker) =>
              `${worker.name.padEnd(10)} | ⚡ ${formatHashRate(
                worker.hashRate
              ).padEnd(7)} | ✅ ${worker.validShares
                .toString()
                .padEnd(6)} | ⚠️ ${worker.staleShares.toString().padEnd(2)}`
          )
          .join("\n") +
        "```"
      : "No active workers.";

    // Create Embed
    const embed = new EmbedBuilder()
      .setColor("#ff9c00")
      .setTitle("⛏️ **HashVault Mining Stats** ⛏️")
      .addFields(
        {
          name: "🏆 Confirmed Balance",
          value: `**${confirmedBalanceXMR} XMR**`,
          inline: true,
        },
        {
          name: "⚡ Current Hash Rate",
          value: `**${formatHashRate(collective.hashRate)}**`,
          inline: true,
        },
        {
          name: "✅ Valid Shares",
          value: `**${collective.validShares}**`,
          inline: true,
        },
        {
          name: "👷‍♂️ Active Workers",
          value: workerSummary,
        }
      );

    // Send or Update Message
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!messageId) {
      const sentMessage = await channel.send({ embeds: [embed] });
      messageId = sentMessage.id;
    } else {
      const message = await channel.messages.fetch(messageId);
      await message.edit({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Error fetching mining stats:", error.message);
  }
}

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  fetchMiningStats();
  setInterval(fetchMiningStats, 20000);
});

client.login(TOKEN);
