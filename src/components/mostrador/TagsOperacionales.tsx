const TAGS_CONFIG = [
  { nombre: "Equipaje Extra", icono: "ti-luggage" },
  { nombre: "Mascota", icono: "ti-paw" },
  { nombre: "Horario Nocturno", icono: "ti-moon" },
];

interface Props {
  tags: string[];
  onToggle: (tag: string) => void;
}

export default function TagsOperacionales({ tags, onToggle }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Tags operacionales</label>
      <div className="flex gap-2">
        {TAGS_CONFIG.map(({ nombre, icono }) => {
          const activo = tags.includes(nombre);
          return (
            <button
              key={nombre}
              type="button"
              onClick={() => onToggle(nombre)}
              className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors ${
                activo
                  ? "bg-blue-50 text-blue-700 border-blue-100"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <i className={`ti ${icono} text-base`} aria-hidden="true" />
              {nombre.replace("Horario ", "").replace(" Extra", "")}
            </button>
          );
        })}
      </div>
    </div>
  );
}