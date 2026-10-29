import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ShowcaseProjectDetailView,
  type ShowcaseProjectDetail,
} from "@/components/projects/showcase-project-detail";

export const instant = false;

async function getProject(id: string): Promise<ShowcaseProjectDetail | null> {
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  const response = await fetch(
    `${baseUrl.replace(/\/+$/, "")}/showcase-projects/${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Impossible de charger ce projet.");
  return (await response.json()) as ShowcaseProjectDetail;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project?.title ?? "Projet" };
}

export default async function ProjetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  return <ShowcaseProjectDetailView project={project} />;
}
