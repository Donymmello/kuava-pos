import { api } from './api';
import { ApiSuccessResponse, SubscriptionPlan, SubscriptionRequest, SubscriptionStatus } from '../types';

interface StatusResponseBody {
  has_access: boolean;
  trial_ends_at: string | null;
  subscription_expires_at: string | null;
  pending_request: SubscriptionRequest | null;
  plans: Array<{ plan: SubscriptionPlan; price_mzn: number }>;
  bank_details: { bank_name: string; account_holder: string; nib: string };
}

export async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const response = await api.get<ApiSuccessResponse<StatusResponseBody>>('/subscription/status');
  const body = response.data.data;

  return {
    hasAccess: body.has_access,
    trialEndsAt: body.trial_ends_at,
    subscriptionExpiresAt: body.subscription_expires_at,
    pendingRequest: body.pending_request,
    plans: body.plans.map((entry) => ({ plan: entry.plan, priceMzn: entry.price_mzn })),
    bankDetails: {
      bankName: body.bank_details.bank_name,
      accountHolder: body.bank_details.account_holder,
      nib: body.bank_details.nib,
    },
  };
}

export async function createSubscriptionRequest(plan: SubscriptionPlan): Promise<SubscriptionRequest> {
  const response = await api.post<ApiSuccessResponse<SubscriptionRequest>>('/subscription/requests', { plan });
  return response.data.data;
}
