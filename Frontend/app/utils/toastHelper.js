import Toast from 'react-native-toast-message';

// Normalize error messages from backend or network
export const normalizeMessage = (error) => {
  if (!error) return "Something went wrong. Please try again.";

  let rawMessage = "";

  if (typeof error === "string") {
    rawMessage = error;
  } else if (error.response && error.response.data) {
    rawMessage = error.response.data.message || error.response.data.error || error.response.data || "";
    if (typeof rawMessage !== "string") {
      rawMessage = JSON.stringify(rawMessage);
    }
  } else {
    rawMessage = error.message || "";
  }

  const msg = rawMessage.toLowerCase();

  if (msg.includes("invalid credentials") || msg.includes("username or phone not found") || msg.includes("incorrect password") || msg.includes("incorrect username or password")) {
    return "Incorrect username or password";
  }
  if (msg.includes("request already exists") || msg.includes("udar request already exists") || msg.includes("already requested") || msg.includes("already requested approval")) {
    return "Request already submitted";
  }
  if (msg.includes("unauthorized") || msg.includes("access denied") || msg.includes("no token provided")) {
    return "Please login again.";
  }
  if (msg.includes("network error") || msg.includes("unable to connect") || msg.includes("failed to connect") || msg.includes("network request failed") || msg.includes("err_connection")) {
    return "Unable to connect. Please try again.";
  }
  if (msg.includes("internal server error") || msg.includes("database error") || msg.includes("failed to") || msg.includes("500") || msg.includes("axioserror") || msg.includes("status code")) {
    return "Something went wrong. Please try again.";
  }

  return rawMessage || "Something went wrong. Please try again.";
};

export const showSuccess = (message, title = 'Success') => {
  const displayMsg = typeof message === 'string' ? message : (message?.message || message?.data?.message || 'Success');
  Toast.show({
    type: 'success',
    text1: title,
    text2: displayMsg,
    position: 'bottom',
    visibilityTime: 3000,
  });
};

export const showError = (message, title = 'Error') => {
  Toast.show({
    type: 'error',
    text1: title,
    text2: normalizeMessage(message),
    position: 'bottom',
    visibilityTime: 4000,
  });
};

export const showInfo = (message, title = 'Info') => {
  const displayMsg = typeof message === 'string' ? message : (message?.message || message?.data?.message || 'Info');
  Toast.show({
    type: 'info',
    text1: title,
    text2: displayMsg,
    position: 'bottom',
    visibilityTime: 3000,
  });
};
