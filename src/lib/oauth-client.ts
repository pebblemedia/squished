import { supabase } from "@/integrations/supabase/client";

export interface AuthorizationDetails {
  client?: { name?: string };
  redirect_uri?: string;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
}
type OAuthResult<T> = { data: T | null; error: { message: string } | null };
interface OAuthClient {
  getAuthorizationDetails(id: string): Promise<OAuthResult<AuthorizationDetails>>;
  approveAuthorization(id: string): Promise<OAuthResult<{ redirect_url?: string; redirect_to?: string }>>;
  denyAuthorization(id: string): Promise<OAuthResult<{ redirect_url?: string; redirect_to?: string }>>;
}
// A local type boundary for the provider's beta OAuth namespace; calls remain SDK calls.
export const oauthClient = (supabase.auth as unknown as { oauth: OAuthClient }).oauth;