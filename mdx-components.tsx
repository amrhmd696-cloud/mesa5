import type { MDXComponents } from "mdx/types";
import Link from "next/link";

// Componentes que usan los archivos .mdx (blog y páginas legales).
// Los enlaces internos usan <Link> para navegar sin recargar.
const components: MDXComponents = {
  a: ({ href = "", ...props }) =>
    href.startsWith("/") ? <Link href={href} {...props} /> : <a href={href} target="_blank" rel="noopener noreferrer" {...props} />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
