import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Heart, MessageCircle, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ProjectCardProps {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  author: { name: string; city: string | null };
  technologies: string[];
  likeCount: number;
  commentCount: number;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProjectCard({
  id,
  title,
  description,
  imageUrl,
  author,
  technologies,
  likeCount,
  commentCount,
}: ProjectCardProps) {
  return (
    <Link
      href={`/projets/${id}`}
      aria-label={`Voir le projet ${title}`}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="flex h-full flex-col overflow-hidden border transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-xl group-hover:shadow-primary/8">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br from-accent/10 via-primary/5 to-background">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`Capture du projet ${title}`}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <Rocket className="h-12 w-12 text-primary/50 transition-transform duration-300 group-hover:scale-110" />
          )}
        </div>

        <CardContent className="flex flex-1 flex-col gap-3 p-4">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
            {title}
          </h3>

          <p className="flex-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
          <div className="flex flex-wrap gap-1">
            {technologies.map((t) => (
              <Badge key={t} variant="outline" className="px-2 text-[11px]">
                {t}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between border-t pt-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {getInitials(author.name)}
              </span>
              <span className="max-w-[110px] truncate text-xs text-muted-foreground">
                {author.name}
              </span>
            </div>
            <ExternalLink
              aria-hidden="true"
              className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary"
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {likeCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {commentCount}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
