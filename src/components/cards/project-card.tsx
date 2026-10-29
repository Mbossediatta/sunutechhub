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
    <Card className="group flex flex-col overflow-hidden border hover:border-primary/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/8 transition-all duration-200">
      {/* Thumbnail */}
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

      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        <Link href={`/projets/${id}`}>
          <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
        </Link>

        <p className="text-xs text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
          {description}
        </p>
        <div className="flex flex-wrap gap-1">
          {technologies.map((t) => (
            <Badge key={t} variant="outline" className="text-[11px] px-2">
              {t}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              {getInitials(author.name)}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[110px]">
              {author.name}
            </span>
          </div>
          <Link
            href={`/projets/${id}`}
            aria-label={`Voir le projet ${title}`}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
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
  );
}
