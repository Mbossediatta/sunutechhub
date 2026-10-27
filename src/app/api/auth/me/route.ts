import { getAuthenticatedUser } from "@/lib/backend-auth";

export async function GET() {
  return getAuthenticatedUser();
}
