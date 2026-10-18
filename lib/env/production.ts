import { EnvironmentError, optionalEnvironmentValue, requireSupabaseEnvironment, type SupabaseEnvironmentInput } from './validation';
import { resolveAppOrigin, requireDeploymentOrigin, type AppOriginInput } from './app-origin';

export interface ProductionEnvironmentInput extends SupabaseEnvironmentInput, AppOriginInput {
  GEMINI_API_KEY?: string;
}

/** Call only for the deployment environments that require a fully live app.
 * This module deliberately imports neither server-only nor the Next runtime,
 * so next.config.ts can use it before application compilation starts.
 */
export function validateProductionEnvironment(input: ProductionEnvironmentInput): void {
  const appOrigin = resolveAppOrigin(input);
  if (!appOrigin) {
    throw new EnvironmentError('NEXT_PUBLIC_APP_URL', 'is required when no Vercel production/deployment URL is available');
  }
  requireDeploymentOrigin(appOrigin, 'NEXT_PUBLIC_APP_URL');
  const supabase = requireSupabaseEnvironment(input);
  requireDeploymentOrigin(supabase.url, 'NEXT_PUBLIC_SUPABASE_URL');
  if (!optionalEnvironmentValue(input.GEMINI_API_KEY)) {
    throw new EnvironmentError('GEMINI_API_KEY', 'is required in the server environment for the production deployment');
  }
}
