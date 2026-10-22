-- Default checklist for every property and the starting supply catalog.
-- Both can be edited in the app (Admin → Checklist / Estoque).

insert into public.checklist_items (room, label, tip, requires_photo, position) values
  -- Chegada
  ('Chegada', 'Abrir as janelas para ventilar o apartamento',
   'O cheiro é a primeira coisa que o hóspede percebe ao entrar.', false, 10),
  ('Chegada', 'Verificar danos e objetos esquecidos pelo hóspede',
   'Achou algo quebrado, sujo demais ou esquecido? Use "Reportar problema" com foto antes de limpar.', false, 20),
  ('Chegada', 'Retirar roupa de cama e toalhas usadas', null, false, 30),
  ('Chegada', 'Recolher todo o lixo e colocar sacos novos nas lixeiras', null, false, 40),

  -- Cozinha
  ('Cozinha', 'Lavar, secar e guardar toda a louça (nada na pia ou no escorredor)',
   'Copos com marca d''água chamam atenção: seque com pano limpo.', false, 110),
  ('Cozinha', 'Limpar fogão/cooktop, forno e coifa',
   'Gordura no fogão é uma das reclamações mais comuns nas avaliações.', false, 120),
  ('Cozinha', 'Limpar o micro-ondas por dentro e por fora (prato giratório também)',
   'O hóspede sempre abre o micro-ondas. Confira o teto e o prato.', false, 130),
  ('Cozinha', 'Esvaziar a geladeira, descartar comida deixada e limpar prateleiras', null, false, 140),
  ('Cozinha', 'Limpar cafeteira e jogar fora cápsulas/borra usadas', null, false, 150),
  ('Cozinha', 'Limpar bancada, pia, torneira e portas dos armários', null, false, 160),
  ('Cozinha', 'Repor café, açúcar, detergente, esponja nova e pano de prato limpo',
   'Esponja nova a cada hóspede: esponja usada passa sensação de sujeira.', false, 170),
  ('Cozinha', 'Foto da cozinha pronta', null, true, 180),

  -- Banheiro
  ('Banheiro', 'Limpar e desinfetar o vaso (por baixo da tampa, do assento e na base)',
   'Manchas no vaso derrubam a nota de limpeza na hora.', false, 210),
  ('Banheiro', 'Remover TODOS os cabelos do ralo, pia, box e chão',
   'Cabelo é a reclamação nº 1 de limpeza no Airbnb. Use a lanterna do celular para conferir.', false, 220),
  ('Banheiro', 'Limpar box, vidro e azulejos (sem marcas de sabão)', null, false, 230),
  ('Banheiro', 'Limpar pia, espelho e torneiras (sem respingos)',
   'Espelho sem manchas e metais brilhando passam a sensação de hotel.', false, 240),
  ('Banheiro', 'Repor papel higiênico (com rolo extra), sabonete, shampoo e condicionador', null, false, 250),
  ('Banheiro', 'Colocar toalhas limpas dobradas no padrão da casa', null, false, 260),
  ('Banheiro', 'Foto do banheiro pronto', null, true, 270),

  -- Quarto e sala
  ('Quarto e sala', 'Arrumar a cama com roupa de cama limpa, bem esticada',
   'Lençol sem rugas e travesseiros alinhados: é a foto que o hóspede compara com o anúncio.', false, 310),
  ('Quarto e sala', 'Tirar o pó de móveis, cabeceira, mesas, TV, luminárias e prateleiras', null, false, 320),
  ('Quarto e sala', 'Verificar embaixo da cama, do sofá e dentro dos armários',
   'Hóspedes encontram (e fotografam) o que fica embaixo dos móveis.', false, 330),
  ('Quarto e sala', 'Aspirar e passar pano no chão, incluindo cantos e rodapés', null, false, 340),
  ('Quarto e sala', 'Limpar marcas de dedo em espelhos, vidros, portas e interruptores', null, false, 350),
  ('Quarto e sala', 'Testar TV, controles, ar-condicionado e Wi-Fi',
   'Controle sem pilha ou ar sem funcionar vira reclamação. Reporte se algo falhar.', false, 360),
  ('Quarto e sala', 'Organizar almofadas, mantas e cabides no armário', null, false, 370),
  ('Quarto e sala', 'Foto da cama arrumada', null, true, 380),
  ('Quarto e sala', 'Foto da sala pronta', null, true, 390),

  -- Finalização
  ('Finalização', 'Conferir e anotar o estoque (seção Estoque abaixo)', null, false, 910),
  ('Finalização', 'Toque final: cortinas abertas, aroma suave, tudo no lugar',
   'Entrar em um ambiente claro e cheiroso faz o hóspede começar a estadia de bom humor.', false, 920),
  ('Finalização', 'Desligar ar e luzes e fechar as janelas', null, false, 930),
  ('Finalização', 'Levar o lixo para o local correto do prédio', null, false, 940),
  ('Finalização', 'Trancar a porta e conferir a fechadura', null, false, 950);

insert into public.inventory_items (name, unit, default_par, position) values
  ('Papel higiênico', 'rolos', 4, 10),
  ('Sabonete', 'un', 2, 20),
  ('Shampoo', 'un', 1, 30),
  ('Condicionador', 'un', 1, 40),
  ('Detergente', 'un', 1, 50),
  ('Esponja', 'un', 2, 60),
  ('Sacos de lixo', 'un', 10, 70),
  ('Café / cápsulas', 'un', 6, 80),
  ('Açúcar / adoçante', 'un', 1, 90),
  ('Jogo de lençol', 'jogos', 2, 100),
  ('Toalha de banho', 'un', 4, 110),
  ('Toalha de rosto', 'un', 2, 120),
  ('Pano de prato', 'un', 2, 130),
  ('Produto de limpeza multiuso', 'un', 1, 140);
