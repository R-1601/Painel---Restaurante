/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // hover: só em aparelhos com mouse (no celular o toque deixava o efeito preso)
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      // Identidade "Tempero": urucum, açafrão e folha de louro
      colors: {
        pimenta: {
          DEFAULT: '#3A2318', // texto principal
          2: '#5E4335', // texto secundário
          3: '#7E6254', // legendas e rótulos
          4: '#9C8275', // vazio / desativado
        },
        pele: '#FCEFE6', // fundo da página
        linha: '#F1E2D8', // divisórias internas
        borda: '#EAD5C7', // contorno de blocos e campos
        urucum: {
          DEFAULT: '#C2410C', // cor da marca e ações
          dark: '#9A3412',
          bg: '#FBE3D6',
        },
        acafrao: {
          DEFAULT: '#EBA31B', // destaque e alertas leves
          dark: '#8A5A00',
          bg: '#FBEBC8',
        },
        louro: {
          DEFAULT: '#56743F', // lucro, positivo
          bg: '#E6EEDD',
        },
        erro: {
          DEFAULT: '#B3261E', // prejuízo, vencido, erro
          bg: '#FBE0DA',
        },
        'sidebar-text': '#E8D3C6',
        'sidebar-active': '#FFFFFF',
      },
      fontFamily: {
        sans: ['Outfit', 'Arial', 'sans-serif'],
        display: ['Caprasimo', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
