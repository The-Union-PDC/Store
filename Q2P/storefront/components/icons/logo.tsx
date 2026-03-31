import Image from 'next/image';

export default function LogoIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/images/the-union-muay-thai-boxing-gym-favicon.png"
      alt="The Union Muay Thai & Boxing Gym"
      width={32}
      height={32}
      className={className ?? 'h-8 w-8 object-contain'}
    />
  );
}
