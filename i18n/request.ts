import { getRequestConfig } from "next-intl/server";
import { defaultLocale } from "./config";

// De momento solo hay español. Para añadir otro idioma:
// 1) crea messages/<idioma>.json copiando es.json y traduciéndolo,
// 2) añádelo a `locales` en i18n/config.ts,
// 3) decide cómo se elige (preferencia del perfil, cookie o prefijo en la URL).
export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
