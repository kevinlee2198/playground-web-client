export function mockPreferencesResponse() {
  return {
    data: {
      me: {
        preferences: {
          measurementUnit: "METRIC",
          notificationsEnabled: true,
          emailDigestFrequency: "WEEKLY",
          profileVisibility: "PUBLIC",
          showOnlineStatus: true,
          showGameHistory: true,
          showStatistics: true,
          preferredSports: ["BASEBALL", "BASKETBALL"],
        },
      },
    },
  };
}
