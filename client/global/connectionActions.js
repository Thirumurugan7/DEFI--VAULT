export const setConnectionDetails = (connection) => {
  const connectionDetails = {
    provider: connection.provider,
    address: connection?.provider?.address,
  };

  return {
    type: "SET_CONNECTION_DETAILS",
    payload: connectionDetails,
  };
};

export const clearConnectionDetails = () => {
  return {
    type: "CLEAR_CONNECTION_DETAILS",
  };
};
