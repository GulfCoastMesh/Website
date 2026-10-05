export type Partner = {
  name: string;
  href: string;
  logo: string;
  logoWidth: number;
  logoHeight: number;
  cardClassName?: string;
  logoClassName?: string;
};

export const partners: Partner[] = [
  {
    name: "Heltec Automation",
    href: "https://heltec.org/",
    logo: "https://heltec.org/wp-content/uploads/2021/05/heltec-logo.png",
    logoWidth: 140,
    logoHeight: 40,
  },
  {
    name: "Precision Marine Performance Engines",
    href: "https://www.pmefi.com",
    logo: "/supporters/pmefi.jpg",
    logoWidth: 285,
    logoHeight: 124,
  },
  {
    name: "GrumpyMesh",
    href: "https://www.grumpymesh.com/",
    // Official logo from https://www.grumpymesh.com/Media/grumpymesh-logo.png
    logo: "/supporters/grumpymesh.png",
    logoWidth: 625,
    logoHeight: 205,
    cardClassName: "bg-black",
    logoClassName: "h-8 w-auto",
  },
];
