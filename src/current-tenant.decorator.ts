import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { API_KEYS } from "./api-keys";

// In an actual application, this would be a signed JWT or a hashed API key stored per-tenant in the database,
// issued at onboarding not a hardcoded map. This is just to save time as auth is out of scope.
export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const apiKey = context.switchToHttp().getRequest().headers["x-api-key"];
    const slug = API_KEYS[apiKey];

    if (!slug) throw new UnauthorizedException("Missing or invalid x-api-key");

    return slug;
  },
);
