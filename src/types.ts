export type Role='administrador'|'funcionario';export type Status='recebido'|'em_preparo'|'pronto'|'entregue'|'cancelado';export interface Profile{id:string;nome:string;papel:Role;ativo:boolean}export interface Product{id:string;nome:string;preco:number;categoria_id:string|null;disponivel:boolean;ativo:boolean}export interface Category{id:string;nome:string}export interface Order {
  id: string;
  numero: number;
  nome_cliente: string | null;
  numero_mesa: string | null;
  status: Status;
  total: number;
  criado_em: string;
  observacao: string | null;
  categoria_id: string | null;
}