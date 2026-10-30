import { authenticate } from "@/lib/backend-auth";

export async function POST(request: Request) {
  return authenticate(request, "login", "ADMIN_OR_FORMATEUR");
}
