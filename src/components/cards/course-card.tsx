import Link from "next/link";
import { Clock, Users, BookOpen, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  language: string;
  progress: number;
  lessons: number;
  enrolled: number;
  subjects: string[];
}

const levelStyle: Record<string, string> = {
  "Débutant":      "bg-primary/10 text-primary border-primary/20",
  "Intermédiaire": "bg-accent/10 text-accent border-accent/20",
  "Avancé":        "bg-foreground/10 text-foreground border-foreground/20",
};

const gradients: Record<string, string> = {
  "Débutant":      "from-primary/15 to-primary/5",
  "Intermédiaire": "from-accent/15 to-accent/5",
  "Avancé":        "from-muted to-muted/50",
};

export function CourseCard({
  id, title, description, level, duration,
  lessons, enrolled, subjects, progress,
}: CourseCardProps) {
  return (
    <Card className="group flex flex-col overflow-hidden border hover:border-primary/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/8 transition-all duration-200">
      {/* Thumbnail */}
      <div className={cn(
        "relative h-36 bg-gradient-to-br flex items-center justify-center overflow-hidden",
        gradients[level] ?? gradients["Débutant"]
      )}>
        <BookOpen className="h-12 w-12 text-primary/20 group-hover:scale-110 transition-transform duration-300" />
        {/* Badge niveau */}
        <span className={cn(
          "absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full border",
          levelStyle[level] ?? levelStyle["Débutant"]
        )}>
          {level}
        </span>
        {/* Bouton play au hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-primary/10">
          <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Play className="h-5 w-5 text-white ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>

      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {subjects.slice(0, 2).map((s) => (
            <Badge key={s} variant="outline" className="text-[11px] px-2">{s}</Badge>
          ))}
        </div>

        {/* Titre */}
        <Link href={`/cours/${id}`}>
          <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
        </Link>

        <p className="text-xs text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
          {description}
        </p>

        {/* Infos */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />{duration}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />{lessons} leçons
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <Users className="h-3 w-3" />{enrolled.toLocaleString("fr-SN")}
          </span>
        </div>

        {/* Progression */}
        {progress > 0 && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Progression</span>
              <span className="font-medium text-primary">{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <Button
          size="sm"
          variant={progress > 0 ? "default" : "secondary"}
          className="w-full mt-1 rounded-xl"
          asChild
        >
          <Link href={`/cours/${id}`}>
            {progress > 0 ? "Continuer le cours" : "Commencer"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
