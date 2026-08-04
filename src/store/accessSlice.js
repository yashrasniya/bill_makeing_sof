import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { clientToken } from '../axios';

// Fetch the current user's tenant access context:
// permissions, plan features, subscription, admin flags.
//
// Two guards here exist because this endpoint is called more than once per
// session (App.jsx refreshes it on route change and window focus, and React
// StrictMode double-invokes the mount effect in dev). Overlapping requests
// used to race, and whichever reply landed last overwrote the store — so a
// single bad response could drop a Pro session into feature-less "free"
// mode until something re-fetched correctly.
export const fetchAccess = createAsyncThunk(
    'access/fetchAccess',
    async (_, { rejectWithValue }) => {
        const startedAt = Date.now();
        try {
            const response = await clientToken.get('authz/me/');
            return { ...response.data, _startedAt: startedAt };
        } catch (error) {
            return rejectWithValue(error.response?.data);
        }
    },
    {
        // Guard 1: never start a second call while one is in flight.
        condition: (_arg, { getState }) => getState().access.status !== 'loading',
    }
);

const initialState = {
    permissions: [],
    features: [],
    subscription: null,
    companyId: null,
    companyName: null,
    isTenantAdmin: false,
    isProductOwner: false,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    // when the currently-applied payload was requested (for guard 2)
    appliedAt: 0,
};

const accessSlice = createSlice({
    name: 'access',
    initialState,
    reducers: {
        clearAccess: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAccess.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchAccess.fulfilled, (state, action) => {
                state.status = 'succeeded';

                // Guard 2: ignore a reply from a request that was issued
                // before the one already applied. Responses can arrive out
                // of order, and the older one must not win.
                const startedAt = action.payload._startedAt || 0;
                if (startedAt < state.appliedAt) return;
                state.appliedAt = startedAt;

                state.permissions = action.payload.permissions || [];
                state.features = action.payload.features || [];
                state.subscription = action.payload.subscription;
                state.companyId = action.payload.company_id;
                state.companyName = action.payload.company_name;
                state.isTenantAdmin = !!action.payload.is_tenant_admin;
                state.isProductOwner = !!action.payload.is_product_owner;
            })
            .addCase(fetchAccess.rejected, (state) => {
                // Deliberately leaves permissions/features intact: a failed
                // refresh is not evidence that access was revoked, and the
                // route guards only enforce on status === 'succeeded'.
                state.status = 'failed';
            });
    },
});

export const { clearAccess } = accessSlice.actions;

// Selector helpers
export const hasPermission = (state, code) => state.access.permissions.includes(code);
export const hasFeature = (state, code) => state.access.features.includes(code);

export default accessSlice.reducer;
