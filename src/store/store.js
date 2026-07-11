import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import accessReducer from './accessSlice';

export const store = configureStore({
    reducer: {
        user: userReducer,
        access: accessReducer,
    },
});