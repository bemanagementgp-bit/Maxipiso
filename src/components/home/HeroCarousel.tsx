const HERO_VIDEO = "https://res.cloudinary.com/dnaom2evd/video/upload/v1778512357/drone_lgjdsd.mp4";

/**
 * Video de fondo del hero de la home.
 *
 * Antes esto era un carrusel que leia `hero_media` desde /api/hero y se
 * administraba desde /panel/hero. Se elimino: el upload escribia en disco, que
 * en Vercel es de solo lectura, asi que nunca se cargo un solo item en
 * produccion y la home siempre mostro este mismo video de fallback.
 *
 * Si en algun momento se quiere volver a un hero administrable, conviene
 * hacerlo sobre el storage de `lib/storage.ts` con un blob store configurado.
 */
export default function HeroCarousel() {
  return (
    <div className="absolute inset-0">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        src={HERO_VIDEO}
      />
    </div>
  );
}
