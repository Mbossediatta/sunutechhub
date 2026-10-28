import Link from "next/link";
import { ExternalLink, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ProjectCardProps {
  id: string;
  title: string;
  description: string;
  author: { name: string; city: string | null };
  courseTitle: string;
  technologies: string[];
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function ProjectCard({ id, title, description, author, courseTitle, technologies }: ProjectCardProps) {
  return (
    <Card className="group flex flex-col overflow-hidden border hover:border-primary/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/8 transition-all duration-200">
      {/* Thumbnail */}
      <div className="h-36 bg-gradient-to-br from-accent/10 via-primary/5 to-background flex items-center justify-center relative overflow-hidden">
        <Rocket className="h-12 w-12 text-primary/50 transition-transform duration-300 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
      </div>

      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        <Link href={`/projets/${id}`}>
          <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
        </Link>

        <p className="text-xs text-muted-foreground line-clamp-2 flex-1 leading-relaxed">{description}</p>
        <p className="text-xs font-medium text-primary">{courseTitle}</p>

        <div className="flex flex-wrap gap-1">
          {technologies.map((t) => (
            <Badge key={t} variant="outline" className="text-[11px] px-2">{t}</Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              {getInitials(author.name)}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[110px]">{author.name}</span>
          </div>
          <Link href={`/projets/${id}`} aria-label={`Voir le projet ${title}`} className="text-muted-foreground hover:text-primary transition-colors">
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
