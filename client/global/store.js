import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./connectionReducer.js";

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["SET_CONNECTION_DETAILS"],
      },
    }),
});

export default store;
