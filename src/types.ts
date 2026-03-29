export interface Character {
  id: string;
  name: string;
  alias?: string;
  role: string;
  grade: string;
  description: string;
  techniques: string[];
  image: string;
  color: string;
}

export interface CursedTechnique {
  name: string;
  description: string;
  type: string;
}
