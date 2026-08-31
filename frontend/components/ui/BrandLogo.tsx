import Image from "next/image";

type Props = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className = "h-6 w-auto", priority }: Props) {
  return (
    <>
      <Image
        src="/logo.png"
        alt="Guidemate"
        width={1340}
        height={526}
        className={`${className} dark:hidden`}
        priority={priority}
      />
      <Image
        src="/logo-dark.png"
        alt=""
        width={1329}
        height={513}
        className={`${className} hidden dark:block`}
        priority={priority}
        aria-hidden
      />
    </>
  );
}
