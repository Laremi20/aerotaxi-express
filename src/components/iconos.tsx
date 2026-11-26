// Íconos SVG en línea (reemplazan las clases ti-* de Tabler, cuya hoja de estilos nunca se cargó).
// Son decorativos: el texto del botón o del aviso siempre los acompaña.
interface Props {
  className?: string;
}

function Icono({ className = "size-5", children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconoLupa(props: Props) {
  return (
    <Icono {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </Icono>
  );
}

export function IconoMaleta(props: Props) {
  return (
    <Icono {...props}>
      <rect x="5" y="7" width="14" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M9 11v5M15 11v5" />
    </Icono>
  );
}

export function IconoHuella(props: Props) {
  return (
    <Icono {...props}>
      <circle cx="6.5" cy="10" r="1.5" />
      <circle cx="10" cy="6" r="1.5" />
      <circle cx="14" cy="6" r="1.5" />
      <circle cx="17.5" cy="10" r="1.5" />
      <path d="M8 17.5c0-2.6 1.8-5.5 4-5.5s4 2.9 4 5.5c0 1.4-1 2-2 2-.9 0-1.3-.5-2-.5s-1.1.5-2 .5c-1 0-2-.6-2-2Z" />
    </Icono>
  );
}

export function IconoLuna(props: Props) {
  return (
    <Icono {...props}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </Icono>
  );
}

export function IconoCheck(props: Props) {
  return (
    <Icono {...props}>
      <path d="m5 12 5 5 9-10" />
    </Icono>
  );
}

export function IconoX(props: Props) {
  return (
    <Icono {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icono>
  );
}

export function IconoAlerta(props: Props) {
  return (
    <Icono {...props}>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4M12 17h.01" />
    </Icono>
  );
}

export function IconoAuto(props: Props) {
  return (
    <Icono {...props}>
      <path d="M5 16V11l2-5h10l2 5v5" />
      <path d="M3 16h18v3H3zM5 11h14" />
      <circle cx="7.5" cy="16" r="1.5" />
      <circle cx="16.5" cy="16" r="1.5" />
    </Icono>
  );
}

export function IconoSinSenal(props: Props) {
  return (
    <Icono {...props}>
      <path d="M3 3l18 18" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.8M14 10.3A10 10 0 0 1 19 13M12 20h.01" />
    </Icono>
  );
}
