import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { clientToken } from '../axios';

// Fetch the current user's tenant access context:
// permissions, plan features, subscription, admin flags.
export const fetchAccess = createAsyncThunk(
    'access/fetchAccess',
    async (_, { rejectWithValue }) => {
        try {
            const response = await clientToken.get('authz/me/');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data);
        }
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
                state.permissions = action.payload.permissions || [];
                state.features = action.payload.features || [];
                state.subscription = action.payload.subscription;
                state.companyId = action.payload.company_id;
                state.companyName = action.payload.company_name;
                state.isTenantAdmin = !!action.payload.is_tenant_admin;
                state.isProductOwner = !!action.payload.is_product_owner;
            })
            .addCase(fetchAccess.rejected, (state) => {
                state.status = 'failed';
            });
    },
});

export const { clearAccess } = accessSlice.actions;

// Selector helpers
export const hasPermission = (state, code) => state.access.permissions.includes(code);
export const hasFeature = (state, code) => state.access.features.includes(code);

export default accessSlice.reducer;
