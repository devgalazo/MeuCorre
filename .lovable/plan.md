# Planejamento – App Controle Moto (Uber Moto, 99 Moto e entregas)

## O que entendi da sua planilha
- Uma aba por mês, uma linha por dia.
- Corridas: KM, Uber, 99, horas trabalhadas, R$/hora, nº de corridas.
- Entregas: 99Food, iFood, Delmatch, Shopee, Mercado Livre, horas e nº de entregas.
- Gastos do dia: combustível, manutenção, equipamentos, passe.
- Resumo do mês: Ganhos − (equipamentos + combustível + manutenção + passe) = TOTAL. Depois desconta assinaturas (academia, Spotify, recarga...) e gastos pessoais (marmita, cabelo, rolê...) = SUBTOTAL.
- Controle de troca de óleo pelo km da moto.

## Ponto para confirmar
Você respondeu que o lucro desconta só combustível e manutenção, mas a planilha também desconta equipamentos e passe. Proposta (seguindo a planilha):
- **Lucro operacional** = ganhos − combustível − manutenção (o que você pediu, usado no R$/hora e R$/km).
- **Total** = lucro operacional − equipamentos − passe.
- **Sobra final** = total − assinaturas − gastos pessoais (alimentação entra aqui).
Se preferir outra regra, me diga antes de aprovar.

## Telas (feitas para celular, barra de navegação embaixo)
1. **Entrar / Criar conta** – e-mail e senha, recuperar senha.
2. **Hoje** – resumo do dia e botão grande "Lançar dia".
3. **Lançar / editar dia** – data, km total do dia; para cada app ativo: total, dinheiro, cartão, gorjeta, nº de corridas/entregas, horas online; abastecidas (várias por dia); manutenção, equipamentos, passe, alimentação, outros.
4. **Histórico** – lista por dia, semana e mês, com toque para editar ou apagar.
5. **Relatórios** – faturamento, despesas, lucro, R$/hora, R$/km, por app; gráficos de ganhos por dia e por app; exportar para Excel.
6. **Mensais** – assinaturas e gastos pessoais do mês.
7. **Ajustes** – apps ativos (Uber, 99, 99Food, iFood, Delmatch, Shopee, Mercado Livre e adicionar outros), dia de início da semana, km da última troca de óleo e intervalo.

## Etapas
1. Banco de dados seguro na nuvem + login (cada usuário só vê seus dados).
2. Ajustes e cadastro dos apps.
3. Lançamento diário com cálculos automáticos + edição.
4. Histórico diário/semanal/mensal.
5. Gastos mensais (assinaturas e pessoais).
6. Relatórios e gráficos.
7. Exportação para Excel no mesmo formato da sua planilha.
8. Importar os dados de setembro e outubro da planilha (opcional).
Cada etapa será testada antes da próxima.

## Detalhes técnicos
- Lovable Cloud: tabelas apps, dias, ganhos_por_app, abastecidas, despesas, gastos_mensais, ajustes; RLS por usuário.
- Cálculos feitos no app a partir dos dados brutos (nada gravado como total).
- Gráficos com recharts; exportação .xlsx gerada no navegador.
