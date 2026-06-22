export const TAGS_CONFIG = [
  { nombre: "Equipaje Extra", icono: "ti-luggage", label: "Equipaje" },
  { nombre: "Mascota", icono: "ti-paw", label: "Mascota" },
  { nombre: "Horario Nocturno", icono: "ti-moon", label: "Nocturno" },
];

interface Props {
  tags: string[];
  onToggle: (tag: string) => void;
}

export default function TagsOperacionales({ tags, onToggle }: Props) {
  return (
    <div className="flex gap-2 justify-center">
      {TAGS_CONFIG.map(({ nombre, icono, label }) => {
        const activo = tags.includes(nombre);
        return (
          <button
            key={nombre}
            type="button"
            onClick={() => onToggle(nombre)}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors ${
              activo
                ? "bg-blue-50 text-blue-700 border-blue-100 shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <i className={`ti ${icono} text-base`} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}