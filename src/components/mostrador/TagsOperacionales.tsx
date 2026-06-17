const TAGS_DISPONIBLES = ["Equipaje Extra", "Mascota", "Horario Nocturno"];

interface Props {
  tags: string[];
  onToggle: (tag: string) => void;
}

export default function TagsOperacionales({ tags, onToggle }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Tags Operacionales
      </label>
      <div className="flex gap-3">
        {TAGS_DISPONIBLES.map((tag) => (
          <label key={tag} className="flex items-center space-x-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={tags.includes(tag)}
              onChange={() => onToggle(tag)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{tag}</span>
          </label>
        ))}
      </div>
    </div>
  );
}