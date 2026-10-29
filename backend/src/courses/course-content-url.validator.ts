import {
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isCourseContentUrl', async: false })
export class CourseContentUrlValidator implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (typeof value !== 'string') return false;
    if (
      /^storage:\/\/courses\/[A-Za-z0-9_-]+\/[A-Za-z0-9-]+-[A-Za-z0-9._-]+\.pdf$/i.test(
        value,
      )
    ) {
      return true;
    }

    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'Le lien doit être une URL HTTPS ou un PDF téléversé pour ce cours.';
  }
}
