// ⚔️ Every epic and legendary in Grim Dawn 1.3.1.0 (Fangs of Asterkarn included): a fixed snapshot made 14.11.2026
// from GrimTools' item index (grimtools.com, built from the game files). One entry per item: no Empowered/Mythical copies,
// awakened set pieces count as the legendary. Names are the game's own Portuguese text (gender markers removed).
// Fix or add items by hand here; if you RENAME one, add "old name": "new name" to ALIASES in grimdawn.js so collections follow.
// Row: rarity (E epic, L legendary) | kind | icon x | icon y | icon w | icon h | name.  x/y/w/h = the icon's place in SPRITE.
export const SPRITE = "https://www.grimtools.com/db/itemdb/itemdb.webp?1793712231919"; // GrimTools' sheet of every item icon (5.6 MB), fetched on Wi-Fi only
export const SHEET = [3616, 3520]; // the sheet's size in px (positions below are inside it)
export const ITEMS = `
L|sword|3104|1312|32|96|Armagedom
L|sword|2752|1312|32|96|Beira da Morte
L|sword|2464|1312|32|96|Beronath, Reforjada
L|sword|2496|1312|32|96|Canção Sangrenta
L|sword|2368|1312|32|96|Crystallum
L|sword|3232|1312|32|96|Despertar do Sangue
L|sword|2432|1312|32|96|Distorção Mental
L|sword|3136|1312|32|96|Entalha-pecados
L|sword|2880|1312|32|96|Fatiadora de Belgothian
L|sword|3040|1312|32|96|Fatiadora do Demônio das Dunas
L|sword|2688|1312|32|96|Garra da Rainha Louca
L|sword|3584|1120|32|96|Garra de Hrothnar
L|sword|1824|1312|32|96|Garra do Ceifador Sanguinário
L|sword|2656|1312|32|96|Garra do Rapinante
L|sword|2592|1312|32|96|Garra Marcada pela Morte
L|sword|2944|1312|32|96|Laminalma
L|sword|3008|1312|32|96|Lâmina do Demônio das Dunas
L|sword|3168|1312|32|96|Lâmina Sedenta de Sangue
L|sword|2816|1312|32|96|Miséria
L|sword|2720|1312|32|96|Navalha da Lâmina Venenosa
L|sword|2528|1312|32|96|Nex
L|sword|3072|1312|32|96|Noctirn
L|sword|2560|1312|32|96|Ortus
L|sword|3584|1312|32|96|Rasgassangue
L|sword|2912|1312|32|96|Rebento das Feridas Nocivas
L|sword|3488|1312|32|96|Redentora de Malmouth
L|sword|3200|1312|32|96|Runa Funesta
L|sword|2272|1312|32|96|Virtude da Chama
E|sword|1888|1312|32|96|Censora do Magistrado
E|sword|1664|1312|32|96|Espada Elétrica
E|sword|3584|1216|32|96|Espada Longa Kurn
E|sword|2016|1312|32|96|Espinhador
E|sword|1920|1312|32|96|Estigma das Chamas
E|sword|3392|1312|32|96|Fatiadora de Malmouth
E|sword|3552|1312|32|96|Fatiadora de Solael
E|sword|1984|1312|32|96|Labareda Gelada
E|sword|2304|1312|32|96|Lamento do Vazio
E|sword|1760|1312|32|96|Loucura
E|sword|3520|1312|32|96|Lâmina de Bysmiel
E|sword|3424|1312|32|96|Lâmina de Malmouth
E|sword|3456|1312|32|96|Mandíbula do Wendigo
E|sword|1696|1312|32|96|Mordida do Cão
E|sword|2144|1312|32|96|Navalha de Willie
E|sword|2080|1312|32|96|Navalha do Assassino Cego
E|sword|2240|1312|32|96|Orgulho do Legionário
E|sword|1728|1312|32|96|Presságio
E|sword|2112|1312|32|96|Sabre do Busca-tempestade
E|sword|1856|1312|32|96|Sabre do Duelista
E|sword|2176|1312|32|96|Sabre Sangrento
E|sword|1792|1312|32|96|Talhadora Sanguinária
E|sword|2048|1312|32|96|Vocação do Assassino
L|sword2h|128|128|32|128|Alcance da Beladona
L|sword2h|320|128|32|128|Alcance de Nadaan
L|sword2h|256|128|32|128|Arcanor, Lâmina dos Luminari
L|sword2h|224|128|32|128|Arcolâmina Temporal
L|sword2h|288|128|32|128|Dreegal'anore
L|sword2h|768|128|32|128|Ember'thil, a Lâmina do Sol
L|sword2h|384|128|32|128|Grito da Morte
L|sword2h|64|128|32|128|Grito Gélido
L|sword2h|416|128|32|128|Lâmina do Rei do Gelo
L|sword2h|832|128|64|128|Madeira Enorme
L|sword2h|672|128|32|128|Malevolência
L|sword2h|448|128|32|128|Matador Marcado
L|sword2h|640|128|32|128|Rancor
L|sword2h|192|128|32|128|Ruína do Rei do Inverno
L|sword2h|3232|0|32|128|Ruína dos Slith
E|sword2h|3520|0|32|128|Convicção de Cesarin
E|sword2h|3456|0|32|128|Espada de Folhas Cortantes
E|sword2h|3200|0|32|128|Evisceradora Rasga-tripa
E|sword2h|3584|0|32|128|Furilâmina
E|sword2h|3488|0|32|128|Lamento Furioso
E|sword2h|3360|0|32|128|Lâmina da Ira
E|sword2h|704|128|32|128|Lâmina Longa Arcana Kurn
E|sword2h|608|128|32|128|Montante de Dreeg
E|sword2h|576|128|32|128|Montante de Malmouth
E|sword2h|3328|0|32|128|O Conduto
L|axe|960|2656|64|64|Arctis
L|axe|256|2656|64|64|Beira da Sanidade
L|axe|3456|2592|64|64|Brutallax
L|axe|3328|2592|64|64|Carniceiro de Burrwitch
L|axe|1600|2656|64|64|Corruptian
L|axe|640|2656|64|64|Crescente Sanguíneo
L|axe|1888|736|32|96|Cutelo do Ceifador Sanguinário
L|axe|0|2656|64|64|Danação
L|axe|320|2656|64|64|Decapitador de Korba
L|axe|64|2656|64|64|Decapitador Marcado pela Morte
L|axe|448|2656|64|64|Desprezo Abrasador
L|axe|576|2656|64|64|Dilacerador de Tempestades
L|axe|384|2656|64|64|Frenesi de Korba
L|axe|192|2656|64|64|Garra Noturna
L|axe|1728|2656|64|64|Gume da Distorção
L|axe|2432|2592|64|64|Gume da Tempestade
L|axe|3392|2592|64|64|Lua Crescente
L|axe|1408|2656|64|64|Lua Embruxada
L|axe|128|2656|64|64|Mordida de Assolador
L|axe|2816|2592|64|64|Osso Entalhado das Mil Mortes
L|axe|768|2656|64|64|Presa de Fenris
L|axe|704|2656|64|64|Presa de Morkh
L|axe|3520|2592|64|64|Rachador de Terra
L|axe|896|2656|64|64|Rasgador de Véus
L|axe|832|2656|64|64|Rasgo de Chamas
L|axe|512|2656|64|64|Rebento dos Rastros Carmesins
L|axe|2624|2592|64|64|Serra Maldita da Glutonaria
E|axe|2368|2592|64|64|Banquete de Sangue
E|axe|2944|2592|64|64|Chonag'Ri
E|axe|1216|2656|64|64|Cutelo da Seita
E|axe|3008|2592|64|64|Cutelo de Asterkarn
E|axe|1472|2656|64|64|Cutelo de Bysmiel
E|axe|1536|2656|64|64|Cutelo de Dreeg
E|axe|2496|2592|64|64|Cutelo de Krieg
E|axe|1344|2656|64|64|Cutelo do Wendigo
E|axe|1664|2656|64|64|Cutelo Kurn
E|axe|3136|2592|64|64|Esfolador de Halvor
E|axe|3072|2592|64|64|Fatiador das Garras Infernais
E|axe|2688|2592|64|64|Goela Sedenta
E|axe|2240|2592|64|64|Gume Cruel
E|axe|3200|2592|64|64|Gume do Véu
E|axe|2752|2592|64|64|Gume Imaterial
E|axe|1280|2656|64|64|Machado da Seita
E|axe|2560|2592|64|64|Maleficus
E|axe|2880|2592|64|64|Profanador de Cadáveres
E|axe|2304|2592|64|64|Toque do Ceifador
E|axe|3264|2592|64|64|Viscerattus
L|axe2h|128|1120|64|96|A Guilhotina
L|axe2h|640|1120|64|96|Alcance da Morte
L|axe2h|384|1120|64|96|Busca-tempestade de Ultos
L|axe2h|1088|1120|64|96|Demolidora dos Senhores de Ferro
L|axe2h|512|1120|64|96|Dilaceradora de Almas
L|axe2h|0|1120|64|96|Fendedora de Almas
L|axe2h|704|1120|64|96|Guardiã dos Portões da Morte
L|axe2h|896|1120|64|96|Ira de Tenebris
L|axe2h|256|1120|64|96|Ladrão de Tempestades
E|axe2h|3072|1024|64|96|A Libertadora da Fazenda
E|axe2h|3264|1024|64|96|Campeão da Luz
E|axe2h|3520|1024|64|96|Cutelo Abençoado de Mogdrogen
E|axe2h|1600|1120|64|96|Decapitador de Solael
E|axe2h|3328|1024|64|96|Decapitador do Evocador Selvagem
E|axe2h|1472|1120|64|96|Decapitador do Wendigo
E|axe2h|2944|1024|64|96|Dilacerador Fragmósseo
E|axe2h|3456|1024|64|96|Eviscerador Estripa-troll
E|axe2h|3424|0|32|128|Eviscerador Prismático
E|axe2h|3136|1024|64|96|Gadanha de Tenebris
E|axe2h|3264|0|32|128|Garra do Falcão
E|axe2h|64|1120|64|96|Gume do Retornado
E|axe2h|2880|1024|64|96|Massacre
L|mace|3456|928|32|96|A Esmurradora
L|mace|3200|928|32|96|Agonia
L|mace|480|1024|32|96|Aperto de Bysmiel
L|mace|3552|928|32|96|Arauto de Amatok
L|mace|1664|1216|64|96|Baluarte Totalmente Normal
L|mace|3200|1216|64|96|Beemote Totalmente Normal
L|mace|2240|1120|64|96|Broquel Totalmente Normal
L|mace|544|1024|32|96|Crânio de Durn
L|mace|2560|1120|64|96|Escudo Totalmente Normal
L|mace|3488|928|32|96|Esmurradora da Guarda Pétrea
L|mace|0|1024|32|96|Espreitadora da Cripta
L|mace|32|1024|32|96|Eternium
L|mace|1088|1216|64|96|Fragmento da Manhã Totalmente Normal
L|mace|2560|1216|64|96|Guardião Totalmente Normal
L|mace|3392|928|32|96|Infusão de Malakor
L|mace|3360|928|32|96|Malhete da Guerra
L|mace|3520|928|32|96|Malhete das Almas Vorazes
L|mace|96|1024|32|96|Malhete das Cinzas
L|mace|3296|928|32|96|Marreta de Quebraurora
L|mace|3584|928|32|96|Maço de Targo
L|mace|2880|928|32|96|Mão Negra de Sanar'Siin
L|mace|3264|928|32|96|Portadora da Peste de Dreeg
L|mace|3136|928|32|96|Presságio de Morte
L|mace|3328|928|32|96|Punho da Lâmina Venenosa
L|mace|64|1024|32|96|Rebento dos Penhascos Ruinosos
L|mace|3104|928|32|96|Sangue Gélido
L|mace|3424|928|32|96|Trituradora Amarastana
L|mace|384|1024|32|96|Uivo do Wendigo
L|mace|1728|1216|64|96|Árbitro Totalmente Normal
E|mace|2528|928|32|96|Anarquia
E|mace|2752|928|32|96|Desafio
E|mace|2720|928|32|96|Esmagador de Espíritos
E|mace|3040|928|32|96|Espancadora dos Mortos
E|mace|2496|928|32|96|Lamento do Éter
E|mace|3072|928|32|96|Malhete Kalastoriano
E|mace|2848|928|32|96|Malhete Quebra-ossos
E|mace|416|1024|32|96|Martelo de Guerra de Bysmiel
E|mace|288|1024|32|96|Martelo de Guerra de Malmouth
E|mace|448|1024|32|96|Martelo de Guerra de Solael
E|mace|2592|928|32|96|Martelo do Soldado da Guarda
E|mace|320|1024|32|96|Maça de Malmouth
E|mace|352|1024|32|96|Maça do Wendigo
E|mace|512|1024|32|96|Porrete Kurn
E|mace|2912|928|32|96|Progenitora
E|mace|2816|928|32|96|Punho do Assassino Cego
E|mace|3008|928|32|96|Redentora de Aço Gélido
E|mace|2944|928|32|96|Repreensão da Guerra
E|mace|2688|928|32|96|Tocha Abençoada
E|mace|2560|928|32|96|Toque de Malícia
E|mace|2976|928|32|96|Veredito de Barthollem
E|mace|2784|928|32|96|Árbitra de Aço Etéreo
L|mace2h|576|1120|64|96|Devoradora de Mundos de Shar'Zul
L|mace2h|160|128|32|128|Enxofre Infernal
L|mace2h|768|1120|64|96|Esmagadora de Tripa
L|mace2h|192|1120|64|96|Força Destruidora de Obsidiana
L|mace2h|1536|1120|64|96|Impulso Incandescente
L|mace2h|448|1120|64|96|Leviatã
L|mace2h|1152|1120|64|96|Malhete do Elísio
L|mace2h|352|128|32|128|Portadora da Noite
L|mace2h|960|1120|64|96|Rebento da Força Arcana
L|mace2h|1024|1120|64|96|Rebento do Véu Gritante
L|mace2h|96|128|32|128|Repreensão do Punho de Pedra
L|mace2h|3296|0|32|128|Tremor
L|mace2h|320|1120|64|96|Trituradora do Sangue Selvagem
L|mace2h|832|1120|64|96|Trituradora do Vingador
E|mace2h|3392|1024|64|96|Fornalha de Shar'Zul
E|mace2h|3392|1024|64|96|Incineradora de Shar'Zul
E|mace2h|0|128|32|128|Ira de Morgoneth
E|mace2h|3008|1024|64|96|Malhete do Punho de Golem
E|mace2h|3200|1024|64|96|Martelo de Guerra do Juízo Celestial
E|mace2h|3552|0|32|128|Punho de Ultos
E|mace2h|3392|0|32|128|Repreensão de Alvarick
E|mace2h|1408|1120|64|96|Trituradora de Cabeças da Seita
L|spear2h|32|128|32|128|Espada do Sangue Negro
L|spear2h|800|128|32|128|Umbra'dol, Legado de Sangue
E|spear2h|736|128|32|128|Racha-crânios Kurn
L|dagger|1120|832|32|96|Adaga com Runas de Dreeg
L|dagger|160|832|32|96|Adaga Ensanguentada do Pacto
L|dagger|2336|1312|32|96|Aguilhão Carmesim
L|dagger|3136|832|32|96|Anum'fol, o Vento Cortante
L|dagger|1856|832|32|96|Arcanum Infinitum
L|dagger|2752|832|32|96|Chama da Bagata
L|dagger|1984|832|32|96|Corassao das Sumbras
L|dagger|1984|832|32|96|Corassaum das Sombras
L|dagger|1984|832|32|96|Corassão das Sembras
L|dagger|1984|832|32|96|Coraçao das Sobras
L|dagger|1984|832|32|96|Coraçaum das Sombras
L|dagger|1984|832|32|96|Coração das Sobras
L|dagger|1952|832|32|96|Coração das Sombras
L|dagger|2976|1312|32|96|Coração Gélido
L|dagger|2848|1312|32|96|Coração Incandescente
L|dagger|2624|1312|32|96|Coração Tempestuoso
L|dagger|1600|832|32|96|Decreto do Círculo dos Cinco
L|dagger|2400|1312|32|96|Destino Sombrio
L|dagger|608|832|32|96|Divisor de Esterco
L|dagger|992|832|32|96|Dracarris
L|dagger|544|832|32|96|Encantador de Myrgle
L|dagger|1824|832|32|96|Espinha-da-Viúva
L|dagger|224|832|32|96|Farpa de Assolador
L|dagger|928|832|32|96|Fogo Deformador
L|dagger|1248|832|32|96|Fogo Pavoroso
L|dagger|1056|832|32|96|Garra de Basilisco
L|dagger|2784|832|32|96|Garra de Hagaraz
L|dagger|896|832|32|96|Golpe Venenoso
L|dagger|1952|1312|32|96|Ladra de Almas
L|dagger|864|832|32|96|Lasca de Asterkarn
L|dagger|1184|832|32|96|Lâmina da Chama Negra
L|dagger|1952|2656|64|64|Lâmina da Guarda da Morte
L|dagger|1696|832|32|96|Lâmina do Sussurro Frio
L|dagger|1568|832|32|96|Lâmina Enfeitiçada de Alladrah
L|dagger|384|832|32|96|Lâmina Enfeitiçada Iraflama
L|dagger|2208|1312|32|96|Lâmina Purificada de Elgoloth
L|dagger|1440|832|32|96|Pandemia
L|dagger|1280|832|32|96|Perfuradora do Véu
L|dagger|1024|832|32|96|Presa de Ch'thon
L|dagger|448|832|32|96|Talhadora do Andarilho Pavoroso
L|dagger|1760|832|32|96|Talhadora do Senhor Infeccioso
L|dagger|3008|832|32|96|Tece-mentes de Bysmiel
L|dagger|960|832|32|96|Tempestade Temporal
L|dagger|3104|832|32|96|Thundol'sil, o Cavaleiro da Tempestade
L|dagger|2784|1312|32|96|Traição de Pagar
E|dagger|2656|832|32|96|Bebedora de Sangue do Wendigo
E|dagger|2464|832|32|96|Centelha Etérea da Seita
E|dagger|3584|352|32|96|Lâmina Contaminada de Nera'Val
E|dagger|3424|736|32|96|Lâmina do Vazio
E|dagger|3392|736|32|96|Lâmina Enfeitiçada do Evocador de Tempestades
E|dagger|3584|448|32|96|Lâmina Enfeitiçada do Fragmento do Céu
E|dagger|3584|256|32|96|Lâmina Enfeitiçada do Sangue Demoníaco
E|dagger|128|832|32|96|Lâmina Enfeitiçada Glacial
E|dagger|3072|832|32|96|Lâmina Rúnica Ritualística Kurn
E|dagger|256|832|32|96|Mordida de Jaravuuk
E|dagger|2848|832|32|96|Rompe-almas de Bysmiel
E|dagger|2816|832|32|96|Rompe-tormentas de Bysmiel
E|dagger|96|832|32|96|Talhadora da Runa Infernal
E|dagger|3488|736|32|96|Talhadora de Almas
E|dagger|3456|736|32|96|Talhadora do Sangue Pesteado
E|dagger|2688|832|32|96|Tece-caos do Wendigo
E|dagger|3572|128|32|96|Tece-feitiços
E|dagger|2528|832|32|96|Tece-feitiços da Seita
E|dagger|2880|832|32|96|Tece-véu de Dreeg
E|dagger|2720|832|32|96|Tece-éter do Wendigo
E|dagger|2496|832|32|96|Toque Bilioso da Seita
E|dagger|480|832|32|96|Véu do Crepúsculo
L|scepter|3232|928|32|96|Arauto dos Fins Chamejantes
L|scepter|1888|832|32|96|Asterllonos, Estrela do Norte
L|scepter|1408|832|32|96|Bebedor de Feitiços
L|scepter|1472|832|32|96|Centelha da Realidade
L|scepter|832|832|32|96|Centelha de Ultos
L|scepter|2112|832|32|96|Chifre Celestial de Beronath
L|scepter|2144|832|32|96|Chifre Perdido do Vazio de Beronath
L|scepter|1216|832|32|96|Decreto de Aldritch
L|scepter|1216|832|32|96|Decreto de Malmouth
L|scepter|352|832|32|96|Dedo de Gar'Dalvur
L|scepter|1344|832|32|96|Evocador Gelofogo
L|scepter|1504|832|32|96|Farol das Almas Perdidas
L|scepter|3168|928|32|96|Farol do Véu do Inverno
L|scepter|672|832|32|96|Flagelo Negro
L|scepter|2016|832|32|96|Foco do Conjurador de Tempestades
L|scepter|768|832|32|96|Frio de Olexra
L|scepter|1152|832|32|96|Guarda-estrelas de Trozan
L|scepter|704|832|32|96|Ira do Ascendente
L|scepter|1728|832|32|96|Julgamento dos Três
L|scepter|3584|736|32|96|Ligavidas
L|scepter|1920|832|32|96|Malhete do Mercador de Espíritos
L|scepter|2656|928|32|96|Martelo Sagrado da Ira Eterna
L|scepter|1664|832|32|96|Misericórdia de Empyrion
L|scepter|1792|832|32|96|Pináculo do Vazio
L|scepter|736|832|32|96|Portador de Almas
L|scepter|1632|832|32|96|Rebento dos Ventos Penetrantes
L|scepter|1376|832|32|96|Runa de Elgoloth
L|scepter|1312|832|32|96|Tece-medo
L|scepter|1536|832|32|96|Tempestigador de Allagast
L|scepter|640|832|32|96|Toque de Pureza
L|scepter|3040|832|32|96|Vampirris
L|scepter|1088|832|32|96|Varinha do Clarividente
L|scepter|800|832|32|96|Varinha Replicante de Panetti
E|scepter|64|832|32|96|Armadilha Tempestuosa
E|scepter|288|832|32|96|Canalizador de Ulzaad
E|scepter|3584|640|32|96|Cetro da Pedra Faiscante
E|scepter|3584|544|32|96|Cetro da Tempestade de Fogo
E|scepter|192|832|32|96|Cetro de Aldritch
E|scepter|192|832|32|96|Cetro de Malmouth
E|scepter|3360|736|32|96|Cetro do Coração Gélido
E|scepter|3552|736|32|96|Emanação Gelada
E|scepter|320|832|32|96|Evocador de Tempestades Arcanas
E|scepter|2944|832|32|96|Guarda-chama de Solael
E|scepter|2624|832|32|96|Guarda-frio de Malmouth
E|scepter|416|832|32|96|Invocador Ciclônico
E|scepter|3520|736|32|96|Invocador Cortosiano
E|scepter|32|832|32|96|Invocador Cósmico
E|scepter|0|832|32|96|Invocador da Pedra Infectante
E|scepter|512|832|32|96|Invocador de Alakrian
E|scepter|2560|832|32|96|Lança-chamas de Malmouth
E|scepter|2592|832|32|96|Lança-tempestade de Malmouth
E|scepter|576|832|32|96|Runa do Trovão
E|scepter|2976|832|32|96|Tece-sangue de Solael
E|scepter|2912|832|32|96|Tece-veneno de Dreeg
E|scepter|2624|928|32|96|Varinha de Madeira Negra
E|scepter|3328|736|32|96|Varinha do Fogo Místico
E|scepter|3296|736|32|96|Ódio Ardente
L|gun1h|1600|2848|64|64|A Batedora
L|gun1h|1344|2912|64|64|Agulha dos Destinos Desenrolados
L|gun1h|128|2912|64|64|Amplificadora de Anderos
L|gun1h|576|2912|64|64|Aniquiladora de Dagallon
L|gun1h|192|2912|64|64|Arcanum Electrollis
L|gun1h|960|2912|64|64|Arcanum Frigus
L|gun1h|3328|2848|64|64|Arcanum Sigillis
L|gun1h|768|2912|64|64|Corrupção de Gargabol
L|gun1h|1280|2912|64|64|Desfazedora
L|gun1h|512|2912|64|64|Destruidora de Dagallon
L|gun1h|1408|2912|64|64|Destruidora de Igirron
L|gun1h|3456|2848|64|64|Destruidora de Vidas do Assassino de Demônios
L|gun1h|1920|2848|64|64|Esfolador de Almas
L|gun1h|3136|2848|64|64|Estrago
L|gun1h|3200|2848|64|64|Exoneradora
L|gun1h|3264|2848|64|64|Exterminus
L|gun1h|2880|2848|64|64|Ferrão do Deserto
L|gun1h|1152|2912|64|64|Fogo Ardente
L|gun1h|0|2912|64|64|Fogo Cruzado do Forja-canos
L|gun1h|2240|2912|64|64|Furassangue
L|gun1h|704|2912|64|64|Impositora Hagarradiana
L|gun1h|384|2912|64|64|Incineradora do Fulgor Negro
L|gun1h|2048|2912|64|64|Lançadora de Bagatas
L|gun1h|3072|2848|64|64|Língua do Diabo
L|gun1h|2368|2912|64|64|Língua Maligna
L|gun1h|64|2912|64|64|Mortalidade de Morguul
L|gun1h|256|2912|64|64|Núcleo de Brasa
L|gun1h|2176|2848|64|64|Pacificador de Burrwitch
L|gun1h|3008|2848|64|64|Perfurador do Vazio
L|gun1h|896|2912|64|64|Portador dos Juramentos
L|gun1h|832|2912|64|64|Rebento da Vingança Ardente
L|gun1h|320|2912|64|64|Revólver da Fortaleza
L|gun1h|1024|2912|64|64|Revólver de Ludrigan
L|gun1h|3392|2848|64|64|Revólver do Causamortis
L|gun1h|1088|2912|64|64|Rompe-fase
L|gun1h|1472|2912|64|64|Rupturadora de Igirron
L|gun1h|3520|2848|64|64|Saraivada do Forja-canos
L|gun1h|1216|2912|64|64|Silenciador de Vidurian
E|gun1h|2560|2848|64|64|A Dissidente
E|gun1h|2048|2848|64|64|A Mediadora
E|gun1h|2432|2848|64|64|Abrasa-terra
E|gun1h|1856|2848|64|64|Atirador de Lodo
E|gun1h|1856|2912|64|64|Canhão de Mão da Seita
E|gun1h|2112|2912|64|64|Canhão de Mão de Bysmiel
E|gun1h|2176|2912|64|64|Canhão de Mão de Dreeg
E|gun1h|1280|2848|64|64|Canhão de Mão de Leander Greene
E|gun1h|2112|2848|64|64|Cano Frígido do Implacável Norte
E|gun1h|2304|2912|64|64|Empalador Arcano Kurn
E|gun1h|2368|2848|64|64|Esfolador de Cadáveres
E|gun1h|1344|2848|64|64|Espreitadora de Bruxos
E|gun1h|1472|2848|64|64|Fúria do Saqueador
E|gun1h|2944|2848|64|64|Impositora Espinhossombra
E|gun1h|2240|2848|64|64|Injetor do Boticário
E|gun1h|2624|2848|64|64|Inquisição de Aldur
E|gun1h|1536|2848|64|64|Justiça do Saqueador
E|gun1h|2752|2848|64|64|Lança-tempestade de Ultos
E|gun1h|1920|2912|64|64|Lança-veneno da Seita
E|gun1h|1728|2848|64|64|Motim
E|gun1h|2496|2848|64|64|Perfuradora Gélida
E|gun1h|2304|2848|64|64|Perjura
E|gun1h|1984|2912|64|64|Repetidora do Wendigo
E|gun1h|1984|2848|64|64|Revólver da Peste
E|gun1h|1664|2848|64|64|Revólver da Terceira Companhia
E|gun1h|1408|2848|64|64|Revólver de Orwell
E|gun1h|2816|2848|64|64|Revólver Luminari
E|gun1h|1792|2848|64|64|Vingança do Fora da Lei
E|gun1h|2688|2848|64|64|Âmago de Gargabol
L|gun2h|1632|0|32|128|A Hora dos Bruxos
L|gun2h|640|2976|64|64|A Interrogadora
L|gun2h|1024|2976|64|64|A Serpe do Norte
L|gun2h|1824|0|32|128|Abrasa-medo
L|gun2h|960|2976|64|64|Atiradora de Espinhos de Dreeg
L|gun2h|1664|0|32|128|Cria do Inferno
L|gun2h|3456|2912|64|64|Cuspidor de Dardos
L|gun2h|896|2976|64|64|Dardo de Prata
L|gun2h|1952|0|32|128|Destruidor do Núcleo Estelar
L|gun2h|512|2976|64|64|Destruidora Arcana de Nar
L|gun2h|1920|2976|64|64|Devoradora de Solael
L|gun2h|1760|0|32|128|Espalha-chamas de Ulzuin
L|gun2h|1216|2976|64|64|Evocadora de Elgoloth
L|gun2h|1888|0|32|128|Lança da Alma
L|gun2h|1856|0|32|128|Lança de Veneno
L|gun2h|1344|2976|64|64|Lançadora de Feitiços do Cosedor Rúnico
L|gun2h|1600|0|32|128|O Adversário
L|gun2h|2112|0|32|128|O Desolador
L|gun2h|1312|0|32|128|Portador da Ira
L|gun2h|1152|2976|64|64|Precursora do Sofrimento Eterno
L|gun2h|2048|2976|64|64|Presa de Gelo
L|gun2h|1920|0|32|128|Presságio dos Tempos do Fim
L|gun2h|1280|2976|64|64|Pulverizadora de Gildor
L|gun2h|1088|2976|64|64|Raka'Jax
L|gun2h|1728|0|32|128|Ranca-tripa
L|gun2h|1792|0|32|128|Rifle de Valdun
L|gun2h|768|2976|64|64|Sangvinar
L|gun2h|1472|2976|64|64|Serpe Celestial
L|gun2h|1408|2976|64|64|Serpe de Korvan
L|gun2h|1696|0|32|128|Vórtice de Almas
E|gun2h|448|2976|64|64|Arcobalista da Centelha Elétrica
E|gun2h|1792|2976|64|64|Arcobalista de Dreeg
E|gun2h|64|2976|64|64|Arcobalista de Madeira Negra
E|gun2h|1856|2976|64|64|Arcobalista de Solael
E|gun2h|576|2976|64|64|Arcobalista do Sopro Deformador
E|gun2h|1984|2976|64|64|Arcobalista Kurn
E|gun2h|1280|0|32|128|Atirador com Núcleo de Sal
E|gun2h|192|2976|64|64|Atiradora de Estacas
E|gun2h|1728|2976|64|64|Atiradora de Estacas do Wendigo
E|gun2h|704|2976|64|64|Atiradora de Lâminas Amarastana
E|gun2h|1504|0|32|128|Canhão do Espírito
E|gun2h|2048|0|32|128|Carabina de Malmouth
E|gun2h|320|2976|64|64|Corvo Infausto de Bysmiel
E|gun2h|832|2976|64|64|Devorador do Véu
E|gun2h|3520|2912|64|64|Enfermidade
E|gun2h|1152|0|32|128|Espingarda da Mandíbula Infernal
E|gun2h|0|2976|64|64|Maldição de Burrwitch
E|gun2h|1184|0|32|128|Marca do Diabo
E|gun2h|256|2976|64|64|O Abraço do Aracnídeo
E|gun2h|1248|0|32|128|O Atirador de Elite Escarlate
E|gun2h|1088|0|32|128|O Caçador
E|gun2h|1120|0|32|128|O Olho
E|gun2h|1536|0|32|128|Purificador Ardente
E|gun2h|1472|0|32|128|Repetidor do Guardião da Chama
E|gun2h|1440|0|32|128|Repetidor Furiaço
E|gun2h|1408|0|32|128|Repetidor Sulfúreo
E|gun2h|1376|0|32|128|Rifle de Ferrolho do Franco-atirador
E|gun2h|2080|0|32|128|Rifle de Malmouth
E|gun2h|128|2976|64|64|Sopra-espinho Frígido
E|gun2h|1568|0|32|128|Torrente Cósmica
E|gun2h|1344|0|32|128|Trovão
E|gun2h|384|2976|64|64|Ulda'Jax
E|gun2h|1216|0|32|128|Vontade do Destino
L|shield|3104|2976|64|64|A Última Parada
L|shield|3008|1216|64|96|Baluarte da Alma do Vazio
L|shield|3072|1216|64|96|Baluarte de Hyrian
L|shield|2432|1216|64|96|Baluarte de Markovian
L|shield|1984|1216|64|96|Baluarte de Núcleo Etéreo
L|shield|2688|1216|64|96|Baluarte de Octavius
L|shield|3232|2976|64|64|Baluarte do Flagelo Místico
L|shield|1088|1216|64|96|Baluarte do Fragmento da Manhã
L|shield|1920|1216|64|96|Baluarte do Petrarca
L|shield|2176|1216|64|96|Baluarte Rompe-céu
L|shield|0|3040|64|64|Bastião da Pedra-do-Caos
L|shield|3200|1216|64|96|Beemote Mão de Pedra
L|shield|2496|1216|64|96|Bocarra dos Condenados
L|shield|2816|1216|64|96|Cipó-cardo
L|shield|2752|1216|64|96|Defensor da Fortaleza
L|shield|3296|2976|64|64|Defensor da Virtude
L|shield|2944|1216|64|96|Defensor dos Três
L|shield|64|3040|64|64|Destemido
L|shield|2368|1216|64|96|Dever de Quebraurora
L|shield|3040|2976|64|64|Escudo de Carne
L|shield|3136|1216|64|96|Fragmento da Noite
L|shield|128|1312|64|96|Guarda Colérica
L|shield|3264|1216|64|96|Guarda de Cairn
L|shield|1408|1216|64|96|Guarda de Ravna
L|shield|2624|1216|64|96|O Cavaleiro Cinzento
L|shield|2912|2976|64|64|O Gladiador
L|shield|2048|1216|64|96|O Intocável
L|shield|256|1312|64|96|Occulant
L|shield|2240|1216|64|96|Quebra-cercos
L|shield|3168|2976|64|64|Represália de Turrion
L|shield|2880|1216|64|96|Sepultoque
L|shield|2560|1216|64|96|Vigilante de Erulan
L|shield|2304|1216|64|96|Vingança de Zolhan
L|shield|2112|1216|64|96|Vontade dos Vivos
E|shield|704|1216|64|96|Baluarte Devorador de Espíritos
E|shield|1728|1216|64|96|Baluarte do Flagelo da Tempestade
E|shield|2848|2976|64|64|Bocarra da Fera
E|shield|3488|2976|64|64|Defensor de Bysmiel
E|shield|0|1312|64|96|Defensor de Malmouth
E|shield|640|1216|64|96|Defensor do Cruzamento do Diabo
E|shield|768|1216|64|96|Defensor do Soldado da Guarda
E|shield|3552|2976|64|64|Defensor Kurn
E|shield|1344|1216|64|96|Elementium
E|shield|1216|1216|64|96|Escudo da Perdição
E|shield|1152|1216|64|96|Guarda da Fé
E|shield|1792|1216|64|96|Guarda da Tempestade
E|shield|1024|1216|64|96|Guarda do Lich
E|shield|1600|1216|64|96|Guarda do Mirmidão
E|shield|1280|1216|64|96|Guarda do Perjuro
E|shield|64|1312|64|96|Guarda Espiritual do Wendigo
E|shield|2976|2976|64|64|Guarda Pavorosa
E|shield|3424|2976|64|64|Protetor da Seita
E|shield|192|1312|64|96|Protetor de Dreeg
E|shield|1664|1216|64|96|Repreensão do Legionário
E|shield|832|1216|64|96|Rompe-chamas
E|shield|896|1216|64|96|Sorriso do Diabo
E|shield|960|1216|64|96|Timbre da Legião Negra
E|shield|1536|1216|64|96|Vanguarda da Legião
E|shield|1856|1216|64|96|Vigilante do Norte Congelado
E|shield|1472|1216|64|96|Árbitro Brasaguarda
L|focus|1184|928|32|96|Alma de Asterkarn
L|focus|832|928|32|96|Aperto dos Mortos
L|focus|640|2784|64|64|Cabeça Corrompida de Inashkor
L|focus|832|2784|64|64|Cabeça de Hallanx
L|focus|512|2784|64|64|Cabeça de Inashkor
L|focus|768|2784|64|64|Cabeça de Jarinthor
L|focus|3264|2720|64|64|Ceifeira dos Amaldiçoados
L|focus|2944|2720|64|64|Consumo de Agrivix
L|focus|3328|2720|64|64|Contágio
L|focus|2752|2720|64|64|Crânio de Gul'Amash
L|focus|1088|2784|64|64|Crânio do Rapinante
L|focus|0|2784|64|64|Cubo de Farath
L|focus|2368|2720|64|64|Códice das Mentiras
L|focus|2880|2720|64|64|Códice das Tormentas Eternas
L|focus|3456|2720|64|64|Códice das Verdades
L|focus|3200|2720|64|64|Códice de Agrivix
L|focus|2304|2720|64|64|Códice de Repetições de Panetti
L|focus|256|2784|64|64|Códice do Adivinho
L|focus|2048|2720|64|64|Códice do Juízo
L|focus|384|2784|64|64|Códice dos Portais Violentos
L|focus|704|2784|64|64|Efígie de Pyran
L|focus|800|928|32|96|Efígie de Uroboruuk
L|focus|576|2784|64|64|Efígie do Ciclone
L|focus|1920|2720|64|64|Esfera de Muitas Lâminas
L|focus|704|928|32|96|Excrementos da Besta Ladradora
L|focus|2240|2720|64|64|Fenda do Vazio
L|focus|64|2784|64|64|Flagelo Infernal
L|focus|192|2784|64|64|Foco de Valguur
L|focus|960|2720|64|64|Grimório Negro de Og'Napesh
L|focus|3520|2720|64|64|Iraflama de Ixillor
L|focus|320|2784|64|64|Julgamento de Empyrion
L|focus|3008|2720|64|64|Labareda do Invocador
L|focus|1216|2784|64|64|Marca Gélida
L|focus|1024|2784|64|64|Olho do Arcanum Infinitum
L|focus|128|2784|64|64|Olho do Cataclismo
L|focus|2624|2720|64|64|Olho do Domínio
L|focus|2560|2720|64|64|Orador dos Mortos
L|focus|1152|2720|64|64|Orbe Canalizador do Pacto
L|focus|3136|2720|64|64|Orbe da Chama Negra
L|focus|2496|2720|64|64|Orbe Sangrento de Ch'thon
L|focus|2496|2784|64|64|Palavra de Solael
L|focus|1728|2720|64|64|Palavra do Inquisidor Abalon
L|focus|960|2784|64|64|Portão para Muitos Mundos
L|focus|896|2784|64|64|Rebento dos Presságios Celestes
L|focus|864|928|32|96|Sussurro do Murmúrio
L|focus|2176|2784|64|64|Tempesteiro de Malmouth
L|focus|736|928|32|96|Tenacidade do Demônio
L|focus|1152|2784|64|64|Textos de Eldrun
L|focus|3072|2720|64|64|Textos de Iskandra
L|focus|448|2784|64|64|Tomo da Expiação
L|focus|1984|2720|64|64|Tomo do Andarilho Pavoroso
L|focus|2688|2720|64|64|Tomo do Ermo Arcano
L|focus|3392|2720|64|64|Tomo do Olhar do Demônio
L|focus|2432|2720|64|64|Tomo dos Nomes
L|focus|2816|2720|64|64|Tomo Infausto de Nar'Adin
L|focus|768|928|32|96|Vaidade de Aldanar
E|focus|1344|2720|64|64|Arquivo do Abrasador
E|focus|1152|928|32|96|Bastão de Controle de Feras Kurn
E|focus|1600|2720|64|64|Bocarra Virulenta
E|focus|640|928|32|96|Coça-costas de Edrick
E|focus|1472|2720|64|64|Códice de Callidor
E|focus|1664|2720|64|64|Códice de Malligosta
E|focus|576|2720|64|64|Demência
E|focus|928|928|32|96|Efígie Arcana da Seita
E|focus|1120|928|32|96|Efígie Contaminada de Bysmiel
E|focus|1056|928|32|96|Efígie Cáustica do Wendigo
E|focus|992|928|32|96|Efígie da Vida do Wendigo
E|focus|1280|2720|64|64|Efígie do Evocador de Tempestades
E|focus|960|928|32|96|Efígie do Veneno da Seita
E|focus|1088|928|32|96|Efígie Fogo-véu de Bysmiel
E|focus|1024|928|32|96|Efígie Gelante do Wendigo
E|focus|832|2720|64|64|Efígie Malformada
E|focus|896|928|32|96|Efígie Vil da Seita
E|focus|608|928|32|96|Garra de Serpe
E|focus|2112|2720|64|64|Manifestarius
E|focus|896|2720|64|64|Miséria de Banshee
E|focus|1088|2720|64|64|Nocturnis
E|focus|672|928|32|96|Rebento da Tempestade
E|focus|1024|2720|64|64|Textos Sagrados de Menhir
E|focus|2048|2784|64|64|Tomo Corrompido de Malmouth
E|focus|2176|2720|64|64|Tomo da Labareda Purulenta
E|focus|1216|2720|64|64|Tomo das Pestes
E|focus|704|2720|64|64|Tomo de Maiven
E|focus|768|2720|64|64|Tomo do Herege
E|focus|1408|2720|64|64|Tomo do Senhor da Morte
E|focus|1984|2784|64|64|Tomo do Vazio de Malmouth
E|focus|2432|2784|64|64|Tomo do Vazio de Solael
E|focus|1792|2720|64|64|Tomo dos Ventos Frígidos
E|focus|1856|2720|64|64|Tomo Infernal
E|focus|2112|2784|64|64|Tomo Infernal de Malmouth
E|focus|2240|2784|64|64|Tomo Porta-almas de Dreeg
E|focus|2368|2784|64|64|Tomo Tece-céu de Solael
E|focus|2304|2784|64|64|Tomo Tece-véu de Dreeg
E|focus|1536|2720|64|64|Vontade de Padala
E|focus|640|2720|64|64|Vontade Esmagadora
L|head|3200|2080|64|64|Ardileza do Venomante
L|head|1280|2080|64|64|Bocarra do Desespero
L|head|384|2080|64|64|Caldeirão do Entusiasmo
L|head|832|2144|64|64|Capuz da Guarda da Morte
L|head|2112|2080|64|64|Capuz de Dreeg
L|head|1984|2144|64|64|Capuz de Harra
L|head|2240|2080|64|64|Capuz de Iskandra
L|head|320|2144|64|64|Capuz de Korba
L|head|2304|2080|64|64|Capuz de Ultos
L|head|512|2144|64|64|Capuz do Assassino de Magos
L|head|1856|2144|64|64|Capuz do Negociante de Ossos
L|head|2112|2144|64|64|Capuz do Senhor Infeccioso
L|head|960|2144|64|64|Capuz do Sombrio
L|head|576|2080|64|64|Capuz do Vinculador de Demônios
L|head|2176|2080|64|64|Capuz Marcado pela Morte
L|head|3200|2144|64|64|Capuz Uivo Selvagem
L|head|1792|2144|64|64|Chapéu de Ludrigan
L|head|2432|2080|64|64|Chapéu de Trozan
L|head|2496|2080|64|64|Chapéu de Valdun
L|head|1856|2080|64|64|Chapéu do Assassino de Demônios
L|head|1920|2080|64|64|Chapéu do Clarividente
L|head|640|2144|64|64|Chapéu do Cosedor Rúnico
L|head|3264|2016|64|64|Chifres de Ekket'Zul
L|head|1472|2144|64|64|Chifres de Korvaak
L|head|3392|2144|64|64|Chifres do Pesadelo Eterno
L|head|128|2208|64|64|Cicatrizes Sedentas de Sangue
L|head|2048|2080|64|64|Cimeira de Ulzuin
L|head|384|2144|64|64|Cimeira do Fulgor Negro
L|head|704|2208|64|64|Coroa do Rei do Gelo
L|head|2368|2080|64|64|Coroa do Rei do Inverno
L|head|1344|2144|64|64|Coroa do Rei Retornado
L|head|1728|2144|64|64|Coroa do Sussurro Frio
L|head|1408|2144|64|64|Elmo de Soulare
L|head|2432|2144|64|64|Elmo de Targo
L|head|384|2208|64|64|Elmo do Cavaleiro Melancólico
L|head|2880|2080|64|64|Elmo do Defensor da Luz
L|head|1216|2080|64|64|Elmo do Jubassangue
L|head|896|2080|64|64|Elmo do Petrarca
L|head|1664|2144|64|64|Elmo do Subjugador
L|head|576|2144|64|64|Gemas de Valguur
L|head|768|2208|64|64|Glifos de Scorv
L|head|2752|2080|64|64|Gorro da Lâmina Venenosa
L|head|448|2208|64|64|Gorro da Tempespresa
L|head|3520|2144|64|64|Gorro de Fenris
L|head|256|2080|64|64|Gorro do Andarilho Pavoroso
L|head|1216|2016|64|64|Gorro do Ceifador Sanguinário
L|head|1728|2080|64|64|Gorro do Evocador de Feras
L|head|3072|2080|64|64|Gorro do Furissangue
L|head|1664|2080|64|64|Guarda-rosto da Justiça
L|head|768|2144|64|64|Guarda-rosto de Dagallon
L|head|2944|2080|64|64|Guarda-rosto do Cavaleiro Infernal
L|head|1472|2080|64|64|Máscara Abissal
L|head|3072|2144|64|64|Máscara Cerimonial do Reino Despedaçado
L|head|704|2080|64|64|Máscara da Serpente da Tempestade
L|head|1600|2080|64|64|Máscara da Verdade Infernal
L|head|192|2144|64|64|Máscara das Almas Perdidas
L|head|1024|2144|64|64|Máscara de Belgothian
L|head|128|2144|64|64|Máscara de Krieg
L|head|3328|2080|64|64|Máscara de Osso de Serpe
L|head|2560|2144|64|64|Máscara de Putregheist
L|head|1088|2144|64|64|Máscara de Radaggan
L|head|896|2144|64|64|Máscara do Adivinho
L|head|2816|2144|64|64|Máscara do Bebedor de Sangueira
L|head|2944|2144|64|64|Máscara do Chamado da Brasa
L|head|2048|2144|64|64|Máscara do Ciclone
L|head|2304|2144|64|64|Máscara do Demônio das Dunas
L|head|2688|2144|64|64|Máscara do Guardião do Véu
L|head|1792|2080|64|64|Máscara do Precursor
L|head|1536|2144|64|64|Máscara do Reino Despedaçado
L|head|1152|2144|64|64|Máscara Língua Geosa
L|head|1344|2080|64|64|Máscara Pavorosa de Gurgoth
L|head|576|2208|64|64|Olhar da Guardiã do Mundo
L|head|1920|2144|64|64|Olhar da Virtude
L|head|64|2208|64|64|Olhar de Apoclypton
L|head|3456|2080|64|64|Olhar de Empyrion
L|head|2816|3104|64|64|Olhar de Lokarr
L|head|3328|2016|64|64|Olhar Desalmado
L|head|1280|2144|64|64|Olhar do Fragmento da Manhã
L|head|3136|2080|64|64|Olhar do Necrolorde
L|head|320|2208|64|64|Olhar dos Destinos Desenrolados
L|head|2624|2080|64|64|Olhar Feérico
L|head|3264|2080|64|64|Olhar Místico
L|head|64|2144|64|64|Olhar Pavoroso de Assolador
L|head|0|2208|64|64|Olho de Jarldin
L|head|3264|2144|64|64|Olhos da Tormenta Primordial
L|head|1088|2208|64|64|Olhos dos Escolhidos de Mogdrogen
L|head|2688|2080|64|64|Pacto dos Três
L|head|2560|2080|64|64|Segredo da Proscrita
L|head|960|2208|64|64|Semblante Cinzento da Chama Primordial
L|head|2496|2144|64|64|Semblante da Alma do Vazio
L|head|512|2208|64|64|Semblante da Caminhante dos Sonhos
L|head|2816|2080|64|64|Semblante da Chama Negra
L|head|2240|2144|64|64|Semblante de Callagadra
L|head|1152|2080|64|64|Semblante de Lokhor
L|head|2624|2144|64|64|Semblante de Morgoneth
L|head|2176|2144|64|64|Semblante de Okaloth
L|head|2368|2144|64|64|Semblante de Pyran
L|head|896|2208|64|64|Semblante de Scorv
L|head|704|2144|64|64|Semblante de Uroboruuk
L|head|640|2208|64|64|Semblante de Zakull
L|head|1216|2144|64|64|Semblante do Cavaleiro Sangrento
L|head|1280|2208|64|64|Semblante Marcado
L|head|1984|2016|64|64|Semblante Profano do Pacto
L|head|1408|2080|64|64|Sussurrante de Segredos
L|head|1408|2016|64|64|Tempestade do Vazio
L|head|1536|2080|64|64|Testeira da Grande Serpente
L|head|1088|2080|64|64|Testemunha do Véu
L|head|3008|2080|64|64|Viseira da Guerra
L|head|1984|2080|64|64|Viseira de Markovian
L|head|256|2144|64|64|Viseira de Octavius
L|head|448|2144|64|64|Viseira do Flagelo Místico
L|head|1216|2208|64|64|Visor de Igirron
L|head|256|2208|64|64|Visão Amaldiçoada de Eldrun
L|head|3392|2080|64|64|Voz de Dreeg
E|head|2752|2016|64|64|Borguinhota do Guardião Feérico
E|head|1664|2016|64|64|Capuz Chispassombra
E|head|1344|2208|64|64|Capuz da Proscrita
E|head|832|2080|64|64|Capuz de Daega
E|head|1152|2016|64|64|Capuz de Maiven
E|head|2176|2016|64|64|Capuz do Miasma
E|head|3200|2016|64|64|Chapéu do Caçador de Recompensas
E|head|3072|2016|64|64|Chapéu do Recompositor de Putrefação
E|head|320|2080|64|64|Chapéu Luminari
E|head|448|2080|64|64|Chapéu Rasga-céu
E|head|960|2016|64|64|Cimeira do Anacoreta
E|head|1088|2016|64|64|Cobertura do Explorador
E|head|512|2080|64|64|Coroa de Gemas Infernais
E|head|896|2016|64|64|Coroa do Comando
E|head|2432|2016|64|64|Coroa do Fragmento Gélido
E|head|832|2016|64|64|Coroa do Submundo
E|head|2112|2016|64|64|Elmo da Guarda da Aurora
E|head|1024|2016|64|64|Elmo do Soldado da Guarda
E|head|1472|2016|64|64|Glória do Cavaleiro Prateado
E|head|2688|2016|64|64|Gorro de Mogdrogen
E|head|1856|2016|64|64|Gorro do Assassino Cego
E|head|768|2016|64|64|Gorro do Berserker
E|head|2304|2016|64|64|Gorro do Evocador Selvagem
E|head|2048|2016|64|64|Gorro do Paradigma
E|head|3008|2016|64|64|Grinalda de Almas
E|head|1792|2016|64|64|Guarda-rosto da Perdição
E|head|2368|2016|64|64|Guarda-rosto Pretoriano
E|head|768|2080|64|64|Máscara da Labareda Purulenta
E|head|128|2080|64|64|Máscara da Sentinela de Prata
E|head|640|2080|64|64|Máscara de Baldir
E|head|960|2080|64|64|Máscara de Fettan
E|head|1728|2016|64|64|Máscara do Arauto
E|head|64|2080|64|64|Máscara do Corruptor
E|head|1344|2016|64|64|Máscara do Delírio
E|head|2944|2016|64|64|O Triunvirato
E|head|3392|2016|64|64|Olhar Contaminado
E|head|0|2080|64|64|Olhar de Assolador
E|head|1024|2080|64|64|Olhar de Callagadra
E|head|3136|2016|64|64|Olhar Expurgador
E|head|1280|2016|64|64|Olho da Observadora
E|head|1920|2016|64|64|Olho de Vidro do Franco-atirador
E|head|2240|2016|64|64|Olhos de Chama
E|head|2560|2016|64|64|Olhos do Ceifador
E|head|192|2080|64|64|Semblante do Arauto da Tormenta
E|head|1536|2016|64|64|Terror do Bosque
E|head|2496|2016|64|64|Testeira da Raiva Ardente
E|head|704|2016|64|64|Testeira do Evocador de Tempestades
E|head|1600|2016|64|64|Testeira Tece-espíritos
E|head|2624|2016|64|64|Viseira do Mirmidão
L|shoulder|2560|2464|64|64|Arvoredo da Guardiã do Mundo
L|shoulder|2048|2464|64|64|Auréola de Apoclypton
L|shoulder|3008|2336|64|64|Brafoneiras Amarastanas
L|shoulder|1792|2464|64|64|Brafoneiras da Garra de Sangue
L|shoulder|2304|2400|64|64|Brafoneiras da Guerra
L|shoulder|1792|2400|64|64|Brafoneiras de Iskandra
L|shoulder|3008|2400|64|64|Brafoneiras de Octavius
L|shoulder|3328|2336|64|64|Brafoneiras do Cavaleiro Espectral
L|shoulder|2176|2400|64|64|Brafoneiras do Cavaleiro Infernal
L|shoulder|2304|2464|64|64|Brafoneiras do Cavaleiro Melancólico
L|shoulder|256|2464|64|64|Brafoneiras do Fragmento da Manhã
L|shoulder|2880|2400|64|64|Brafoneiras do Vingador
L|shoulder|320|2464|64|64|Brafoneiras Espectrósseas
L|shoulder|960|2400|64|64|Brafoneiras Titânicas
L|shoulder|2112|2400|64|64|Dragonas do Defensor da Luz
L|shoulder|832|2400|64|64|Espaldares da Fúria Sanguinária
L|shoulder|1856|2400|64|64|Espaldares de Ultos
L|shoulder|704|2464|64|64|Guarda da Virtude
L|shoulder|2496|2400|64|64|Guarda do Cavaleiro Pavoroso
L|shoulder|2816|2464|64|64|Guarda Marcada
L|shoulder|2752|2400|64|64|Guarda-ombros com Núcleo Incandescente
L|shoulder|1216|2400|64|64|Guarda-ombros da Justiça
L|shoulder|1728|2464|64|64|Guarda-ombros da Onda da Morte
L|shoulder|448|2400|64|64|Guarda-ombros da Pedra de Sangue
L|shoulder|2496|2464|64|64|Guarda-ombros das Cinzas
L|shoulder|768|2400|64|64|Guarda-ombros de Aço Divino
L|shoulder|3520|2400|64|64|Guarda-ombros de Belgothian
L|shoulder|1920|2464|64|64|Guarda-ombros de Fenris
L|shoulder|832|2464|64|64|Guarda-ombros de Harra
L|shoulder|2816|2400|64|64|Guarda-ombros de Krieg
L|shoulder|1344|2464|64|64|Guarda-ombros de Putregheist
L|shoulder|1344|2400|64|64|Guarda-ombros de Quebraurora
L|shoulder|960|2464|64|64|Guarda-ombros de Rah'Zin
L|shoulder|1216|2464|64|64|Guarda-ombros de Targo
L|shoulder|1600|2400|64|64|Guarda-ombros de Ulzuin
L|shoulder|3136|2400|64|64|Guarda-ombros do Assassino de Magos
L|shoulder|3456|2336|64|64|Guarda-ombros do Caçador de Recompensas
L|shoulder|3200|2400|64|64|Guarda-ombros do Cosedor Rúnico
L|shoulder|2368|2400|64|64|Guarda-ombros do Furissangue
L|shoulder|640|2464|64|64|Guarda-ombros do Negociante de Ossos
L|shoulder|768|2464|64|64|Guarda-ombros dos Três
L|shoulder|128|2464|64|64|Guarda-ombros Língua Geosa
L|shoulder|1728|2400|64|64|Guarda-ombros Marcados pela Morte
L|shoulder|2112|2464|64|64|Guarda-ombros Sedentos de Sangue
L|shoulder|2624|2464|64|64|Guarda-ossos de Zakull
L|shoulder|1664|2464|64|64|Manto Cerimonial do Reino Despedaçado
L|shoulder|2432|2400|64|64|Manto Chamaviva
L|shoulder|1280|2464|64|64|Manto da Alma do Vazio
L|shoulder|2432|2464|64|64|Manto da Caminhante dos Sonhos
L|shoulder|2048|2400|64|64|Manto da Chama Negra
L|shoulder|0|2464|64|64|Manto da Guarda da Morte
L|shoulder|2624|2400|64|64|Manto da Labareda
L|shoulder|2944|2400|64|64|Manto das Almas Perdidas
L|shoulder|896|2400|64|64|Manto das Chamas Sombrias
L|shoulder|2240|2400|64|64|Manto de Agrivix
L|shoulder|3328|2400|64|64|Manto de Allagast
L|shoulder|1152|2400|64|64|Manto de Carne de Demônio
L|shoulder|1664|2400|64|64|Manto de Dreeg
L|shoulder|2176|2464|64|64|Manto de Eldrun
L|shoulder|1088|2464|64|64|Manto de Ghol
L|shoulder|2880|3104|64|64|Manto de Lokarr
L|shoulder|512|2400|64|64|Manto de Lokhor
L|shoulder|1920|2400|64|64|Manto de Mogdrogen
L|shoulder|1152|2464|64|64|Manto de Pyran
L|shoulder|64|2464|64|64|Manto de Radaggan
L|shoulder|1856|2464|64|64|Manto de Rituais Blasfemos
L|shoulder|1984|2400|64|64|Manto de Trozan
L|shoulder|3264|2400|64|64|Manto de Uroboruuk
L|shoulder|3392|2400|64|64|Manto do Adivinho
L|shoulder|1536|2464|64|64|Manto do Bebedor de Sangueira
L|shoulder|1600|2464|64|64|Manto do Chamado da Brasa
L|shoulder|896|2464|64|64|Manto do Ciclone
L|shoulder|1472|2400|64|64|Manto do Clarividente
L|shoulder|1472|2464|64|64|Manto do Guardião do Véu
L|shoulder|448|2464|64|64|Manto do Reino Despedaçado
L|shoulder|1408|2400|64|64|Manto do Sangue Selvagem
L|shoulder|1088|2400|64|64|Manto do Sangue Vil
L|shoulder|1024|2464|64|64|Manto do Senhor Infeccioso
L|shoulder|3456|2400|64|64|Manto do Sombrio
L|shoulder|512|2464|64|64|Manto do Subjugador
L|shoulder|576|2464|64|64|Manto do Sussurro Frio
L|shoulder|704|2400|64|64|Manto do Tece-destino
L|shoulder|2240|2464|64|64|Manto dos Destinos Desenrolados
L|shoulder|384|2464|64|64|Manto Forjagelada
L|shoulder|2688|2400|64|64|Manto Língua Venenosa
L|shoulder|1024|2400|64|64|Manto Pavorgélido
L|shoulder|2560|2336|64|64|Manto Profano do Pacto
L|shoulder|1408|2464|64|64|Manto Trevoso de Morgoneth
L|shoulder|2688|2464|64|64|Olhos de Prodromus
L|shoulder|1280|2400|64|64|Ombreiras do Evocador de Feras
L|shoulder|2560|2400|64|64|Os Pergaminhos Cortosianos
L|shoulder|2368|2464|64|64|Peles da Tempespresa
L|shoulder|1984|2464|64|64|Peles de Jarldin
L|shoulder|576|2400|64|64|Peles do Jubassangue
L|shoulder|192|2464|64|64|Pergaminhos do Cavaleiro Sangrento
L|shoulder|2752|2464|64|64|Sombra do Pavor
L|shoulder|1536|2400|64|64|Vanguarda de Markovian
L|shoulder|3072|2400|64|64|Vanguarda do Flagelo Místico
E|shoulder|2368|2336|64|64|Brafoneiras Decoradas
E|shoulder|3072|2336|64|64|Brafoneiras do Guardião da Chama
E|shoulder|2688|2336|64|64|Dragonas da Guarda da Aurora
E|shoulder|2304|2336|64|64|Dragonas de Choque
E|shoulder|3200|2336|64|64|Espaldares de Mogdrogen
E|shoulder|2048|2336|64|64|Espaldares do Belicista
E|shoulder|2112|2336|64|64|Espaldares do Soldado da Guarda
E|shoulder|3392|2336|64|64|Guarda-ombros Abrasados por Tempestades
E|shoulder|2496|2336|64|64|Guarda-ombros da Perdição
E|shoulder|0|2400|64|64|Guarda-ombros da Sentinela de Prata
E|shoulder|192|2400|64|64|Guarda-ombros do Briguento Empoeirado
E|shoulder|2176|2336|64|64|Guarda-ombros do Granadeiro
E|shoulder|2624|2336|64|64|Guarda-ombros do Paradigma
E|shoulder|2816|2336|64|64|Guarda-ombros Pretorianos
E|shoulder|2752|2336|64|64|Guarda-ombros Sulfúreos
E|shoulder|1984|2336|64|64|Manto Astral
E|shoulder|128|2400|64|64|Manto Brasaveia
E|shoulder|320|2400|64|64|Manto da Labareda Purulenta
E|shoulder|2432|2336|64|64|Manto da Padroeira
E|shoulder|256|2400|64|64|Manto de Baldir
E|shoulder|3136|2336|64|64|Manto de Callidor
E|shoulder|384|2400|64|64|Manto de Daega
E|shoulder|2880|2336|64|64|Manto do Alquimista
E|shoulder|3520|2336|64|64|Manto do Corruptor
E|shoulder|64|2400|64|64|Manto do Espreita-feitiços
E|shoulder|3264|2336|64|64|Manto do Evocador de Espectros
E|shoulder|2240|2336|64|64|Manto do Olho Choroso
E|shoulder|640|2400|64|64|Manto do Pavor
E|shoulder|1920|2336|64|64|Manto Espinhoso de Costagume
E|shoulder|2944|2336|64|64|Manto Jubafria
L|chest|512|640|64|96|Armadura Cerimonial do Reino Despedaçado
L|chest|128|640|64|96|Armadura da Alma do Vazio
L|chest|2752|448|64|96|Armadura da Serpente da Tempestade
L|chest|1344|640|64|96|Armadura da Tempespresa
L|chest|3200|544|64|96|Armadura da Virtude
L|chest|1280|448|64|96|Armadura de Batalha de Zolhan
L|chest|2432|544|64|96|Armadura de Belgothian
L|chest|2176|544|64|96|Armadura de Dagallon
L|chest|768|640|64|96|Armadura de Fenris
L|chest|384|544|64|96|Armadura de Placas de Markovian
L|chest|1792|544|64|96|Armadura de Placas de Octavius
L|chest|3392|544|64|96|Armadura de Rah'Zin
L|chest|1472|544|64|96|Armadura de Tempestrama
L|chest|384|640|64|96|Armadura do Bebedor de Sangueira
L|chest|2624|544|64|96|Armadura do Cavaleiro Sangrento
L|chest|448|640|64|96|Armadura do Chamado da Brasa
L|chest|1984|544|64|96|Armadura do Cosedor Rúnico
L|chest|960|544|64|96|Armadura do Defensor da Luz
L|chest|320|640|64|96|Armadura do Guardião do Véu
L|chest|2944|448|64|96|Armadura do Petrarca
L|chest|1536|640|64|96|Armadura do Rei do Gelo
L|chest|2880|544|64|96|Armadura do Reino Despedaçado
L|chest|2944|544|64|96|Armadura do Subjugador
L|chest|1728|544|64|96|Armadura do Vingador
L|chest|1216|640|64|96|Armadura dos Destinos Desenrolados
L|chest|3264|544|64|96|Armadura dos Três
L|chest|3456|448|64|96|Armadura Pavorosa de Azragor
L|chest|1408|544|64|96|Armadura Rúnica de Ignaffar
L|chest|1152|640|64|96|Armadura Sedenta de Sangue
L|chest|576|640|64|96|Armadura Uivo Selvagem
L|chest|256|1408|64|96|Casaco de Lokarr
L|chest|192|2592|64|64|Casaco do Ceifador Sanguinário
L|chest|1216|544|64|96|Casaco do Furissangue
L|chest|896|640|64|96|Cicatrizes de Jarldin
L|chest|2816|544|64|96|Coração de Yugol
L|chest|256|640|64|96|Coração Negro de Morgoneth
L|chest|2560|448|64|96|Corselete Cortosiano
L|chest|1152|544|64|96|Corselete da Guerra
L|chest|128|544|64|96|Corselete da Justiça
L|chest|3328|544|64|96|Corselete de Harra
L|chest|3520|448|64|96|Corselete de Korvoran
L|chest|1664|544|64|96|Corselete de Krieg
L|chest|192|640|64|96|Corselete de Putregheist
L|chest|64|640|64|96|Corselete de Targo
L|chest|448|544|64|96|Corselete de Ulzuin
L|chest|3136|544|64|96|Corselete do Negociante de Ossos
L|chest|2560|544|64|96|Corselete Língua Geosa
L|chest|704|640|64|96|Couraça da Cinza Desolada
L|chest|768|544|64|96|Couraça da Geada Pavorosa
L|chest|704|544|64|96|Couraça de Ultos
L|chest|1280|640|64|96|Couraça do Cavaleiro Melancólico
L|chest|3136|448|64|96|Couraça do Jubassangue
L|chest|1472|640|64|96|Gaiola de Ossos de Zakull
L|chest|1600|544|64|96|Guarda de Gildor
L|chest|640|640|64|96|Indumentária da Cronotempestade
L|chest|3456|544|64|96|Indumentária de Ghol
L|chest|3072|448|64|96|Indumentária de Lokhor
L|chest|1920|544|64|96|Indumentária de Valguur
L|chest|2304|544|64|96|Indumentária do Adivinho
L|chest|2432|448|64|96|Indumentária do Andarilho Pavoroso
L|chest|0|544|64|96|Indumentária do Mestre de Demônios
L|chest|2368|544|64|96|Indumentária do Sombrio
L|chest|1536|544|64|96|Indumentária do Tece-destino
L|chest|1280|544|64|96|Indumentária do Venomante
L|chest|1984|448|64|96|Indumentária Mortífera
L|chest|3200|448|64|96|Jaqueta de Escamas de Demônio
L|chest|3072|544|64|96|Jaqueta de Ludrigan
L|chest|896|544|64|96|Jaqueta de Valdun
L|chest|256|544|64|96|Jaqueta do Assassino de Demônios
L|chest|1024|544|64|96|Jaqueta do Cavaleiro Infernal
L|chest|3520|544|64|96|Jaqueta do Demônio das Dunas
L|chest|384|2592|64|64|Jaqueta Furtiva da Lâmina Venenosa
L|chest|576|544|64|96|Jaqueta Marcada pela Morte
L|chest|1664|640|64|96|Jaula Marcada
L|chest|3264|448|64|96|Lorigão da Jaula do Diabo
L|chest|64|544|64|96|Lorigão de Aço Divino
L|chest|896|448|64|96|Lorigão de Teia de Aranha
L|chest|2688|544|64|96|Lorigão do Fragmento da Manhã
L|chest|1856|544|64|96|Peles de Korba
L|chest|1408|640|64|96|Placas das Cinzas
L|chest|1024|640|64|96|Pressários de Apoclypton
L|chest|2240|544|64|96|Sudário da Guarda da Morte
L|chest|3328|448|64|96|Sudário da Ilusão
L|chest|2496|544|64|96|Sudário de Radaggan
L|chest|192|544|64|96|Sudário do Evocador de Feras
L|chest|1344|544|64|96|Sudário do Necrolorde
L|chest|2112|544|64|96|Traje de Allagast
L|chest|2048|544|64|96|Traje de Uroboruuk
L|chest|320|544|64|96|Traje do Clarividente
L|chest|1408|448|64|96|Traje Oriental
L|chest|2752|544|64|96|Vestimenta da Fé Dissolvida
L|chest|1088|544|64|96|Vestimenta de Agrivix
L|chest|512|544|64|96|Vestimenta de Dreeg
L|chest|640|544|64|96|Vestimenta de Iskandra
L|chest|0|640|64|96|Vestimenta de Pyran
L|chest|832|544|64|96|Vestimenta de Trozan
L|chest|3392|448|64|96|Vestimenta do Grande Guardião
L|chest|3008|544|64|96|Vestimenta do Sussurro Frio
L|chest|1600|640|64|96|Videiras da Guardiã do Mundo
E|chest|1216|448|64|96|Armadura da Guarda da Aurora
E|chest|2304|448|64|96|Armadura da Sentinela de Prata
E|chest|2688|448|64|96|Armadura de Baldir
E|chest|1664|448|64|96|Armadura de Batalha Forjacaótica
E|chest|640|448|64|96|Armadura de Carapaça Fundida
E|chest|2176|448|64|96|Casaco do Alto Consillar
E|chest|1536|448|64|96|Casaco do Falabravo
E|chest|1152|448|64|96|Casaco do Franco-atirador
E|chest|2048|448|64|96|Corselete da Chama Escura
E|chest|1088|448|64|96|Corselete da Perdição
E|chest|320|448|64|96|Corselete do Caçador Noturno
E|chest|1856|448|64|96|Corselete do Mirmidão
E|chest|2624|448|64|96|Corselete Forjarrúnica
E|chest|1600|448|64|96|Corselete Pretoriano
E|chest|256|2592|64|64|Couraça de Placas de Obsidiana
E|chest|768|448|64|96|Gabardina de Magnison
E|chest|2880|448|64|96|Indumentária de Daega
E|chest|704|448|64|96|Indumentária do Esfolador
E|chest|3008|448|64|96|Indumentária do Mercador de Feras
E|chest|1024|448|64|96|Jaqueta do Arauto
E|chest|1728|448|64|96|Jaqueta do Guardião da Chama
E|chest|384|448|64|96|Jaqueta do Pistoleiro
E|chest|320|2592|64|64|Jaqueta Furtiva do Assassino Cego
E|chest|2496|448|64|96|Jaqueta Luminari
E|chest|64|2592|64|64|Peitoral do Soldado da Guarda
E|chest|512|448|64|96|Peitoral Forjamaldita
E|chest|1472|448|64|96|Peles do Evocador Selvagem
E|chest|576|448|64|96|Sobretudo do Fanático
E|chest|1920|448|64|96|Sobreveste de Mogdrogen
E|chest|2368|448|64|96|Sombra do Infectante
E|chest|2112|448|64|96|Traje Astral
E|chest|2240|448|64|96|Traje do Corruptor
E|chest|1344|448|64|96|Traje do Miasma
E|chest|128|2592|64|64|Túnica do Explorador
E|chest|960|448|64|96|Veste da Invocação Impronunciável
E|chest|448|448|64|96|Veste de Malduin
E|chest|2816|448|64|96|Vestimenta da Labareda Purulenta
E|chest|1792|448|64|96|Vestimenta de Callidor
E|chest|832|448|64|96|Vestimenta do Luto
L|hands|1728|1888|64|64|Alcance de Ghol
L|hands|576|1888|64|64|Alcance Etéreo
L|hands|896|1888|64|64|Aperto Abissaldisforme
L|hands|640|1888|64|64|Aperto Colossal
L|hands|128|1888|64|64|Aperto do Poder Desencadeado
L|hands|768|1888|64|64|Aperto do Precursor
L|hands|1472|1888|64|64|Aperto do Sombrio
L|hands|1152|1888|64|64|As Garras Carmesins
L|hands|0|1888|64|64|Braceletes do Desprezo Vil
L|hands|1664|1888|64|64|Braceletes do Rapinante das Areias
L|hands|2112|1824|64|64|Braceletes Inscritos
L|hands|1216|1888|64|64|Brasatoque
L|hands|2048|1888|64|64|Correntes do Habitante do Núcleo
L|hands|1984|1888|64|64|Correntes do Quebrador de Destinos
L|hands|1856|1888|64|64|Criadores de Cicatrizes
L|hands|448|1888|64|64|Garras de Geloskorn
L|hands|1536|1888|64|64|Garras Dilacerantes do Vazio
L|hands|1280|1888|64|64|Guarda-braços do Assassino de Magos
L|hands|2752|1824|64|64|Luvas Orientais
L|hands|256|1888|64|64|Manoplas de Aço do Vazio
L|hands|2304|1824|64|64|Manoplas de Aço Negro
L|hands|1024|1888|64|64|Manoplas de Ignaffar
L|hands|832|1888|64|64|Manoplas do Defensor da Luz
L|hands|704|1888|64|64|Protetores de Mão da Justiça
L|hands|384|1888|64|64|Protetores de Mão de Osso de Serpe
L|hands|2112|1888|64|64|Punho das Cinzas
L|hands|960|1888|64|64|Punho de Ferro do Senhor Supremo
L|hands|1408|1888|64|64|Punho de Krieg
L|hands|1792|1888|64|64|Punho de Morgoneth
L|hands|1920|1888|64|64|Punho do Bebedor de Putrefação
L|hands|1600|1888|64|64|Punho do Fragmento da Manhã
L|hands|1088|1888|64|64|Punho Gelante de Hagarrad
L|hands|2240|1888|64|64|Punhos Arranca-tripas
L|hands|3520|1824|64|64|Punhos com Excrementos
L|hands|320|1888|64|64|Punhos da Morte do Catador de Ossos
L|hands|512|1888|64|64|Punhos de Presa de Víbora
L|hands|64|1888|64|64|Punhos do Pântano Contaminados
L|hands|2176|1888|64|64|Runas de Savant
L|hands|1344|1888|64|64|Toque de Valguur
L|hands|192|1888|64|64|Toque do Bosque Eterno
E|hands|1728|1824|64|64|Aperto das Sombras
E|hands|3008|1824|64|64|Aperto do Frio Pavoroso
E|hands|2880|1824|64|64|Aperto Obsidiano
E|hands|2816|1824|64|64|Braceletes do Toque do Trovão
E|hands|2240|1824|64|64|Braceletes Rúnicos
E|hands|2176|1824|64|64|Luvas do Briguento
E|hands|2688|1824|64|64|Luvas do Saque Rápido
E|hands|1984|1824|64|64|Luvas do Saqueador
E|hands|2560|1824|64|64|Manoplas da Guarda da Aurora
E|hands|3328|1824|64|64|Manoplas do Rito Sangrento
E|hands|1792|1824|64|64|Manoplas do Zelote
E|hands|2368|1824|64|64|Mitenes do Toque da Seda
E|hands|3200|1824|64|64|Protetores de Mão Chamuscados de Runas
E|hands|1856|1824|64|64|Protetores de Mão da Dança das Lâminas
E|hands|2496|1824|64|64|Protetores de Mão da Perdição
E|hands|2624|1824|64|64|Protetores de Mão de Punhobrasa
E|hands|3456|1824|64|64|Protetores de Mão do Ritual Mortífero
E|hands|3072|1824|64|64|Punho Frígido de Haruud
E|hands|3392|1824|64|64|Punhos de Turin
E|hands|1920|1824|64|64|Punhos do Cria-feitiços
E|hands|2048|1824|64|64|Toque da Alma
E|hands|2944|1824|64|64|Toque da Destruição
E|hands|2432|1824|64|64|Toque do Boticário
E|hands|3136|1824|64|64|Toque do Comando
E|hands|3264|1824|64|64|Toque Expurgador
L|waist|2752|3424|64|32|Beijo de Murmúria
L|waist|1856|3424|64|32|Cinta da Fortaleza
L|waist|0|3424|64|32|Cinta da Serpente da Tempestade
L|waist|2688|3424|64|32|Cinta de Rah'Zin
L|waist|2112|3424|64|32|Cinta Quebra-feitiços
L|waist|768|3424|64|32|Cinto das Tripas Enganchadas
L|waist|1920|3424|64|32|Cinto de Munições do Fulgor Negro
L|waist|1728|3392|64|32|Cinto do Alquimista
L|waist|3200|3424|64|32|Cinturão da Cria Mental
L|waist|1792|3424|64|32|Cinturão da Guarda Pétrea
L|waist|960|3424|64|32|Cinturão da Ruína do Martelo
L|waist|3136|3424|64|32|Cinturão de Cronotrama
L|waist|2176|3424|64|32|Cinturão de Fios Fantasmas
L|waist|640|3424|64|32|Cinturão de Osteotrama
L|waist|1536|3424|64|32|Cinturão de Placas Incandescentes
L|waist|1600|3424|64|32|Cinturão Dilacerador
L|waist|3072|3424|64|32|Cinturão do Aço Braseante
L|waist|2304|3424|64|32|Cinturão do Cavaleiro Infernal
L|waist|2240|3424|64|32|Cinturão do Sangue Selvagem
L|waist|2816|3392|64|32|Cinturão do Vidente Flamejante
L|waist|1664|3424|64|32|Cinturão do Vingador
L|waist|2048|3424|64|32|Cinturão dos Sonhos Roubados
L|waist|2240|3392|64|32|Cinturão Espectródio
L|waist|512|3424|64|32|Cinturão Espinhoso da Clareira Enevoada
L|waist|1216|3424|64|32|Cordão Busca-espírito
L|waist|2944|3424|64|32|Cordão da Centelha da Geada
L|waist|1088|3424|64|32|Cordão da Deterioração Violenta
L|waist|1344|3424|64|32|Cordão da Enganação
L|waist|2880|3424|64|32|Cordão de Larvas
L|waist|1664|3392|64|32|Cordão do Acólito
L|waist|704|3424|64|32|Cordão do Vaziomante
L|waist|2432|3392|64|32|Cordão do Vidente Estelar
L|waist|3008|3424|64|32|Cordão Infernus
L|waist|2880|3392|64|32|Correntes da Angústia
L|waist|1024|3424|64|32|Correntes de Oleron Reforjadas
L|waist|2496|3424|64|32|Correntes do Fogo Noturno
L|waist|1152|3424|64|32|Distinção do Gladiador
L|waist|832|3424|64|32|Engenhosidade do Funileiro
L|waist|1408|3424|64|32|Escamas de Beronath
L|waist|3264|3424|64|32|Faixa de Eldrun
L|waist|896|3424|64|32|Faixa do Senhor do Sangue
L|waist|1984|3424|64|32|Faixa do Sábio Imortal
L|waist|576|3424|64|32|Faixa Quebralâmina
L|waist|2560|3424|64|32|Lótus Branco
L|waist|2432|3424|64|32|Lótus Carmesim
L|waist|2624|3424|64|32|Nosferattis
L|waist|2816|3424|64|32|Pacote de Meios Mortíferos
L|waist|1280|3424|64|32|Pacote de Meios Traiçoeiros
L|waist|1728|3424|64|32|Pacto do Cataclismo
L|waist|2368|3424|64|32|Pastor da Tempestade
L|waist|1472|3424|64|32|Tormento de Ulzuin
E|waist|3008|3392|64|32|Bolsas do Franco-atirador
E|waist|1920|3392|64|32|Cinto de Munições do Saqueador
E|waist|3136|3392|64|32|Cinto do Assombrante
E|waist|2944|3392|64|32|Cinturão da Senda da Guerra
E|waist|3200|3392|64|32|Cinturão das Chamas Flagelantes
E|waist|2304|3392|64|32|Cinturão de Almatrama
E|waist|3520|3392|64|32|Cinturão de Couro de Demônio
E|waist|192|3424|64|32|Cinturão de Medotrama
E|waist|3456|3392|64|32|Cinturão do Coração de Aço
E|waist|320|3424|64|32|Cinturão do Guardião da Chama
E|waist|384|3424|64|32|Cinturão dos Sonhos Arcanos
E|waist|3392|3392|64|32|Cinturão Litopele
E|waist|2560|3392|64|32|Cordão de Arcanotrama
E|waist|2624|3392|64|32|Cordão do Antepassado
E|waist|2368|3392|64|32|Cordão do Demônio das Sombras
E|waist|64|3424|64|32|Correntes do Ata-almas
E|waist|2496|3392|64|32|Correntes do Vazio Faminto
E|waist|3328|3392|64|32|Correntes Tocadas pela Tempestade
E|waist|448|3424|64|32|Espinhos Sylvianos
E|waist|1984|3392|64|32|Estabilizador de Oldenar
E|waist|3072|3392|64|32|Faixa Beira-céu
E|waist|128|3424|64|32|Faixa de Fios Chamejantes
E|waist|2112|3392|64|32|Faixa de Fios Ctônica
E|waist|2688|3392|64|32|Faixa do Abrasamento
E|waist|256|3424|64|32|Faixa do Equilíbrio
E|waist|2048|3392|64|32|Glória do Chefe Guerreiro
E|waist|2176|3392|64|32|Ligações Banhadas em Sangue
E|waist|1792|3392|64|32|Pacote Utilitário de Frizzick
E|waist|2752|3392|64|32|Sanguinus
E|waist|3264|3392|64|32|Triunfo do Legionário
E|waist|1856|3392|64|32|Troféu do Caçador de Cabeças
L|legs|2752|256|64|96|Calças Extraordinariamente Fabulosas
L|legs|2752|256|64|96|Calças Realmente Fabulosas
L|legs|768|256|64|96|Calças Sujas
L|legs|2624|256|64|96|Calções de Barbaros
L|legs|3200|256|64|96|Coxotes de Juba de Fera
L|legs|3456|256|64|96|Coxotes de Morgoneth
L|legs|1984|256|64|96|Coxotes de Osso de Demônio
L|legs|3520|256|64|96|Coxotes de Trama do Vazio
L|legs|2944|256|64|96|Coxotes do Cavaleiro Pavoroso
L|legs|1792|256|64|96|Coxotes do Desprezo Vil
L|legs|2176|256|64|96|Coxotes Forjainfernais
L|legs|1856|256|64|96|Envoltório de Pernas Astral
L|legs|2560|256|64|96|Envoltório de Pernas da Mente Tranquila
L|legs|832|256|64|96|Envoltório de Pernas de Escamas de Slith
L|legs|2496|256|64|96|Envoltório de Pernas de Nidalla
L|legs|3136|256|64|96|Envoltório de Pernas de Pele Venenosa
L|legs|2304|256|64|96|Envoltório de Pernas do Espectro
L|legs|128|352|64|96|Envoltório de Pernas do Maquinador Feérico
L|legs|320|352|64|96|Envoltório de Pernas Explora-tripas
L|legs|3328|256|64|96|Envoltório de Pernas Runamarca
L|legs|192|352|64|96|Guarda-pernas da Neve Carmesim
L|legs|3264|256|64|96|Guarda-pernas da Pedra da Geada
L|legs|1536|256|64|96|Guarda-pernas da Runa Pavorosa
L|legs|2688|256|64|96|Guarda-pernas da Tormenta Aprisionada
L|legs|256|352|64|96|Guarda-pernas das Lâminas Negras
L|legs|2432|256|64|96|Guarda-pernas de Pele Espinhosa
L|legs|3072|256|64|96|Guarda-pernas do Guarda-mago
L|legs|0|352|64|96|Guarda-pernas do Tecelão do Tempo
L|legs|1216|256|64|96|Guarda-pernas Orientais
L|legs|2816|256|64|96|Guarda-pernas Selváticos
L|legs|2368|256|64|96|Perneiras da Harmonia Arcana
L|legs|3392|256|64|96|Perneiras das Correntes Arcanas
L|legs|2880|256|64|96|Perneiras de Crina de Wendigo
L|legs|2048|256|64|96|Perneiras de Osteotrama
L|legs|2112|256|64|96|Perneiras do Sussurro da Morte
L|legs|2240|256|64|96|Perneiras do Tece-destino
L|legs|64|352|64|96|Perneiras do Tecelão de Sombras
L|legs|3008|256|64|96|Placas Rúnicas de Ignaffar
E|legs|896|256|64|96|Armadura de Pernas do Anacoreta
E|legs|704|256|64|96|Calças do Explorador
E|legs|960|256|64|96|Coxotes da Valentia
E|legs|1024|256|64|96|Envoltório de Pernas Come-carne
E|legs|1472|256|64|96|Envoltório de Pernas da Runa Calcinante
E|legs|1408|256|64|96|Envoltório de Pernas de Feititrama
E|legs|1344|256|64|96|Envoltório de Pernas do Cão Abissal
E|legs|1728|256|64|96|Envoltório de Pernas do Espreita-feitiços
E|legs|1664|256|64|96|Guarda-pernas da Proteção Rúnica
E|legs|1152|256|64|96|Guarda-pernas Descomunais
E|legs|576|256|64|96|Guarda-pernas do Eremita
E|legs|640|256|64|96|Guarda-pernas do Morador do Pântano
E|legs|1920|256|64|96|Guarda-pernas do Rito Sangrento
E|legs|1280|256|64|96|Perneiras da Guarda das Lâminas
E|legs|1088|256|64|96|Perneiras de Couro Sombrio
E|legs|1600|256|64|96|Perneiras de Umbratrama
E|legs|512|256|64|96|Perneiras do Andarilho das Brumas
L|feet|1216|1760|64|64|Botas da Colheita Sombria
L|feet|3200|1760|64|64|Botas da Névoa de Sangue
L|feet|2880|1760|64|64|Botas da Raiva Primordial
L|feet|2816|1760|64|64|Botas de Krieg
L|feet|2752|3104|64|64|Botas de Lokarr
L|feet|1088|1760|64|64|Botas Feitissábias
L|feet|2560|1760|64|64|Botas Transtemporais
L|feet|2944|1760|64|64|Botinas de Pedra
L|feet|2048|1760|64|64|Botinas Despedaçadoras de Ossos
L|feet|2240|1760|64|64|Botinas do Tempestitã
L|feet|2688|1760|64|64|Botinas do Vendaval
L|feet|2368|1760|64|64|Botinas Quebraterra
L|feet|3392|1760|64|64|Esmaga-tripas
L|feet|2112|1760|64|64|Fantasmandantes
L|feet|3072|1760|64|64|Graça do Andarilho da Morte
L|feet|3264|1760|64|64|Grevas da Feltrama
L|feet|2624|1760|64|64|Grevas da Guarda Rúnica
L|feet|2176|1760|64|64|Grevas das Tesouras de Vento
L|feet|2432|1760|64|64|Grevas de Carne de Demônio
L|feet|1920|1760|64|64|Grevas de Espinhos Venenosos
L|feet|1664|1760|64|64|Grevas do Desprezo Vil
L|feet|1792|1760|64|64|Grevas do Golem
L|feet|2496|1760|64|64|Grevas dos Maus Agouros
L|feet|1856|1760|64|64|Guarda-pés de Escamas de Serpe
L|feet|3008|1760|64|64|Passo de Amatok
L|feet|3136|1760|64|64|Passo de Morgoneth
L|feet|3328|1760|64|64|Passo do Chacal
L|feet|1984|1760|64|64|Pisantes do Andarilho do Vazio
L|feet|2304|1760|64|64|Pisantes do Mago Cinzento
L|feet|1728|1760|64|64|Pisantes Obsidiana
L|feet|2752|1760|64|64|Portadoras da Tempestade
E|feet|704|1760|64|64|A Marcha Final
E|feet|448|1760|64|64|Botas da Rapidez Imperceptível
E|feet|768|1760|64|64|Botas de Couro de Cão Abissal
E|feet|320|1760|64|64|Botas Fundidas
E|feet|1408|1760|64|64|Botinas de Pedra Incandescente
E|feet|1024|1760|64|64|Botinas do Profanador
E|feet|960|1760|64|64|Envoltórios Serpentinos
E|feet|640|1760|64|64|Grevas do Cão Sanguinário
E|feet|896|1760|64|64|Grevas do Desordeiro
E|feet|1152|1760|64|64|Grevas do Senhor da Magia
E|feet|384|1760|64|64|Grevas do Vento
E|feet|1600|1760|64|64|Grevas Estraçalhadas por Portal
E|feet|1472|1760|64|64|Guarda-pés Tempespassos
E|feet|1344|1760|64|64|Marcha de Sellecor
E|feet|1536|1760|64|64|Passo de Turin
E|feet|1280|1760|64|64|Pisantes do Andarilho da Morte
E|feet|832|1760|64|64|Pisantes do Aterrador
E|feet|576|1760|64|64|Pisantes do Explorador
E|feet|512|1760|64|64|Racha-solos de Pedra
L|ring|672|3360|32|32|Aliança da Assombração Eterna
L|ring|832|3360|32|32|Aliança da Combustão
L|ring|1952|3360|32|32|Aliança da Forja Noturna
L|ring|1888|3360|32|32|Aliança da Fúria do Inferno
L|ring|1376|3360|32|32|Aliança da Pira Eterna
L|ring|1792|3360|32|32|Aliança da Tempestade do Vazio
L|ring|1984|3360|32|32|Aliança da Trama do Véu
L|ring|2944|3360|32|32|Aliança das Eras
L|ring|2976|3360|32|32|Aliança das Tempestades do Éter
L|ring|544|3360|32|32|Aliança do Fluxo Temporal
L|ring|1760|3360|32|32|Aliança do Fragmento da Manhã
L|ring|3168|3328|32|32|Aliança do Guarda do Véu
L|ring|736|3360|32|32|Aliança do Senhor da Morte
L|ring|3040|3360|32|32|Aliança dos Implacáveis
L|ring|800|3360|32|32|Aliança Sussurrante do Vazio
L|ring|640|3360|32|32|Anel da Matriarca Negra
L|ring|3488|3328|32|32|Anel da Podridão Eterna
L|ring|1568|3360|32|32|Anel de Anubar
L|ring|1632|3360|32|32|Anel de Basti
L|ring|1696|3360|32|32|Anel de Khonsar
L|ring|1536|3360|32|32|Anel de Orissia
L|ring|1504|3360|32|32|Anel de Sethris
L|ring|1664|3360|32|32|Anel de Shuroth
L|ring|1600|3360|32|32|Anel de Tawrot
L|ring|2528|3328|32|32|Anel do Recompositor de Putrefação
L|ring|1728|3360|32|32|Anel Principal de Morgoneth
L|ring|1440|3360|32|32|Autoridade de Bysmiel
L|ring|864|3360|32|32|Bala da Sorte de Jaxxon
L|ring|992|3360|32|32|Coração do Vazio
L|ring|928|3360|32|32|Dualidade de Albrecht
L|ring|608|3360|32|32|Espiral Entrópica
L|ring|1024|3360|32|32|Gema Tempestuosa de Allagast
L|ring|480|3360|32|32|Glifo de Kelphat'Zoth
L|ring|1408|3360|32|32|Glifo do Bruxo da Tempestade
L|ring|768|3360|32|32|Glifo Vinculador de Espíritos
L|ring|576|3360|32|32|Gritos do Éter
L|ring|1472|3360|32|32|Influência de Bysmiel
L|ring|1312|3360|32|32|Juramento da Luz
L|ring|1280|3360|32|32|Menhiriano
L|ring|1088|3360|32|32|Mão Aberta da Misericórdia
L|ring|1152|3360|32|32|Mão Ardente do Invocador
L|ring|1824|3360|32|32|Picada da Viúva
L|ring|1120|3360|32|32|Punho Cerrado da Vingança
L|ring|896|3360|32|32|Reinado do Gelo e do Fogo
L|ring|1920|3360|32|32|Safira da Forja Noturna
L|ring|1056|3360|32|32|Sigilo da Guarda da Morte
L|ring|64|3360|32|32|Sigilo das Tramas Arcanas
L|ring|704|3360|32|32|Sigilo de Belgothian
L|ring|1856|3360|32|32|Sigilo do Barão de Pedra
L|ring|3008|3360|32|32|Sigilo do Devorador de Mundos
L|ring|2592|3328|32|32|Sinete das Ruminações Astrais
L|ring|2752|3328|32|32|Sinete do Vidente Flamejante
L|ring|512|3360|32|32|Sinete Doa-vida
L|ring|448|3360|32|32|Sinete dos Vencidos
L|ring|960|3360|32|32|Sinete Torce-lâmina
L|ring|1248|3360|32|32|Toque de Angústia de Alkamos
L|ring|1216|3360|32|32|Toque de Pavor de Alkamos
L|ring|1184|3360|32|32|Toque Eletrizante do Invocador
L|ring|1344|3360|32|32|Ícore de Yugol
E|ring|1632|3328|32|32|Agonia de Alkamos
E|ring|2880|3360|32|32|Aliança Arcana Kurn
E|ring|96|3360|32|32|Aliança da Vingança Trovejante
E|ring|2848|3328|32|32|Aliança das Almas Errantes
E|ring|2240|3328|32|32|Aliança de Medula
E|ring|32|3360|32|32|Aliança do Brotar da Vida
E|ring|2208|3328|32|32|Aliança do Erudito
E|ring|3136|3328|32|32|Aliança do Espinheiro Carmesim
E|ring|3104|3328|32|32|Aliança do Gelo Negro
E|ring|2816|3328|32|32|Aliança do Senhor da Magia
E|ring|0|3360|32|32|Aliança Espinhosa
E|ring|2496|3328|32|32|Aliança Espreitadora de Espectros
E|ring|2432|3328|32|32|Aliança Eterna
E|ring|2848|3360|32|32|Aliança Maligna Kurn
E|ring|2912|3360|32|32|Aliança Vingativa Kurn
E|ring|3296|3328|32|32|Anel da Intenção Vil
E|ring|3456|3328|32|32|Anel da Onda de Frio
E|ring|2976|3328|32|32|Anel da Valentia
E|ring|1664|3328|32|32|Angústia de Alkamos
E|ring|2688|3328|32|32|Desprezo da Noite
E|ring|288|3360|32|32|Esmeralda do Pacto Selvagem
E|ring|2624|3328|32|32|Ferroada da Viúva
E|ring|2368|3328|32|32|Fogo Estelar
E|ring|3584|3328|32|32|Gema da Aceleração
E|ring|2720|3328|32|32|Histeria
E|ring|2944|3328|32|32|Joia da Coroa Real
E|ring|3040|3328|32|32|Mão Direita da Carnificina
E|ring|3072|3328|32|32|Mão Esquerda da Carnificina
E|ring|2656|3328|32|32|Oblitorix
E|ring|1632|3328|32|32|Pavor de Alkamos
E|ring|2464|3328|32|32|Portador da Maldição
E|ring|384|3360|32|32|Rubi do Equilíbrio Elemental
E|ring|2880|3328|32|32|Sabedoria do Boticário
E|ring|416|3360|32|32|Safira do Equilíbrio Elemental
E|ring|2400|3360|32|32|Selo Arcano de Malmouth
E|ring|2304|3328|32|32|Selo com Obsidiana
E|ring|2528|3360|32|32|Selo Conjurante do Wendigo
E|ring|2912|3328|32|32|Selo da Coroa Real
E|ring|2048|3360|32|32|Selo da Cólera do Diabo
E|ring|2080|3360|32|32|Selo da Cólera dos Rhowari
E|ring|2272|3360|32|32|Selo da Geada da Morte
E|ring|2336|3328|32|32|Selo da Guarda Negra
E|ring|2464|3360|32|32|Selo da Labareda Etérea de Malmouth
E|ring|2304|3360|32|32|Selo da Tempestade da Seita
E|ring|2624|3360|32|32|Selo da Tempestade dos Escolhidos
E|ring|352|3360|32|32|Selo da Tempestade Etérea
E|ring|2560|3360|32|32|Selo da Vida da Morte
E|ring|2592|3360|32|32|Selo das Chamas dos Escolhidos
E|ring|2240|3360|32|32|Selo das Lâminas da Colheita
E|ring|2752|3360|32|32|Selo das Lâminas de Dreeg
E|ring|2432|3360|32|32|Selo das Lâminas de Malmouth
E|ring|3264|3328|32|32|Selo de Anubar
E|ring|3360|3328|32|32|Selo de Basti
E|ring|2176|3360|32|32|Selo de Conjuração da Legião
E|ring|2144|3360|32|32|Selo de Guerra da Legião
E|ring|2016|3360|32|32|Selo de Guerra do Diabo
E|ring|3424|3328|32|32|Selo de Khonsar
E|ring|3232|3328|32|32|Selo de Orissia
E|ring|2176|3328|32|32|Selo de Sangue
E|ring|3200|3328|32|32|Selo de Sethris
E|ring|3392|3328|32|32|Selo de Shuroth
E|ring|3328|3328|32|32|Selo de Tawrot
E|ring|2368|3360|32|32|Selo Defensor da Seita
E|ring|2816|3360|32|32|Selo Disforme de Solael
E|ring|2496|3360|32|32|Selo Disforme do Wendigo
E|ring|3552|3328|32|32|Selo do Anacoreta
E|ring|2336|3360|32|32|Selo do Céu da Seita
E|ring|3520|3328|32|32|Selo do Inferno Ardente
E|ring|2112|3360|32|32|Selo do Vazio dos Rhowari
E|ring|2208|3360|32|32|Selo do Veneno da Colheita
E|ring|2720|3360|32|32|Selo do Veneno de Dreeg
E|ring|2688|3360|32|32|Selo Gelante de Bysmiel
E|ring|2784|3360|32|32|Selo Tempesfogo de Solael
E|ring|2656|3360|32|32|Selo Vil de Bysmiel
E|ring|256|3360|32|32|Sigilo Amarastano
E|ring|320|3360|32|32|Sigilo da Tempestade Etérea
E|ring|160|3360|32|32|Sigilo dos Depravados
E|ring|224|3360|32|32|Sigilo Mutagênico
E|ring|128|3360|32|32|Sinete Colossal
E|ring|3008|3328|32|32|Sinete da Valentia
E|ring|2272|3328|32|32|Sinete do Crepúsculo
E|ring|2560|3328|32|32|Sinete do Pai das Runas
E|ring|2784|3328|32|32|Sinete do Senhor da Magia
E|ring|2400|3328|32|32|Sinete do Senhor Etéreo
E|ring|192|3360|32|32|Sinete dos Condenados
E|ring|1664|3328|32|32|Tormento de Alkamos
L|amulet|1952|3296|32|32|Abraço da Noite
L|amulet|896|3296|32|32|Ametista do Elo da Morte
L|amulet|3520|3264|32|32|Amuleto do Fragmento Infeccioso
L|amulet|960|3296|32|32|Apanhador de Almas
L|amulet|1696|3296|32|32|Arauto do Apocalipse
L|amulet|2208|3296|32|32|Areias de Azrakaa
L|amulet|512|3296|32|32|Armadilha de Gelo
L|amulet|2880|3296|32|32|Avatar da Justiça
L|amulet|736|3296|32|32|Avatar da Misericórdia
L|amulet|2176|3296|32|32|Avatar da Ordem
L|amulet|2240|3296|32|32|Avatar do Caos
L|amulet|1568|3296|32|32|Catalisador do Cataclismo
L|amulet|992|3296|32|32|Chamas da Ira
L|amulet|1312|3296|32|32|Conduto dos Sussurros Arcanos
L|amulet|1184|3296|32|32|Conduto dos Sussurros Beligerantes
L|amulet|1216|3296|32|32|Conduto dos Sussurros Destrutivos
L|amulet|1440|3296|32|32|Conduto dos Sussurros Divinos
L|amulet|1248|3296|32|32|Conduto dos Sussurros Feéricos
L|amulet|1472|3296|32|32|Conduto dos Sussurros Frenéticos
L|amulet|1408|3296|32|32|Conduto dos Sussurros Imorredouros
L|amulet|1280|3296|32|32|Conduto dos Sussurros Noturnos
L|amulet|1376|3296|32|32|Conduto dos Sussurros Rúnicos
L|amulet|1344|3296|32|32|Conduto dos Sussurros Selvagens
L|amulet|2752|3296|32|32|Coração da Montanha
L|amulet|320|3328|32|32|Coração de Malmouth
L|amulet|2720|3296|32|32|Coração de Ulzuin
L|amulet|2304|3296|32|32|Coração do Rei das Areias
L|amulet|3200|3296|32|32|Coração do Rei do Gelo
L|amulet|3264|3296|32|32|Decreto do Pagão
L|amulet|2048|3296|32|32|Defesa do Assassino de Demônios
L|amulet|1664|3296|32|32|Defletor do Flagelo Místico
L|amulet|2656|3296|32|32|Distinção de Markovian
L|amulet|3296|3296|32|32|Efígie Arranca-tripas
L|amulet|2624|3296|32|32|Emblema de Putregheist
L|amulet|832|3296|32|32|Esmeralda da Fúria Estelar
L|amulet|864|3296|32|32|Essência do Alvorecer Sombrio
L|amulet|2016|3296|32|32|Farol de Quebraurora
L|amulet|2976|3296|32|32|Fendas de Asterkarn
L|amulet|704|3296|32|32|Fio da Mortalidade
L|amulet|1024|3296|32|32|Fome de Vigar
L|amulet|352|3328|32|32|Fome do Rapinante
L|amulet|1632|3296|32|32|Fonte do Fulgor Negro
L|amulet|2816|3296|32|32|Fragmento Arcano de Agrivix
L|amulet|1504|3296|32|32|Fragmento da Chama Eterna
L|amulet|1536|3296|32|32|Fragmento das Almas Perdidas
L|amulet|128|3296|32|32|Fragmento de Menhir
L|amulet|2080|3296|32|32|Fragmento do Invocador
L|amulet|3328|3296|32|32|Fragmentos de Igirron
L|amulet|1920|3264|32|32|Gema de Guerra Maravilhosa de Wilhelm
L|amulet|1824|3296|32|32|Gema de Radaggan
L|amulet|2528|3296|32|32|Gema de Rah'Zin
L|amulet|2336|3296|32|32|Gema de Ultos
L|amulet|1760|3296|32|32|Gema do Cosedor Rúnico
L|amulet|2848|3296|32|32|Gema do Furissangue
L|amulet|2432|3296|32|32|Gema do Negociante de Ossos
L|amulet|2400|3296|32|32|Gema do Subjugador
L|amulet|288|3296|32|32|Gema Locustídea
L|amulet|2112|3296|32|32|Gema Negra de Dreeg
L|amulet|3136|3296|32|32|Joia Discordante
L|amulet|192|3296|32|32|Joia do Vínculo Elemental
L|amulet|640|3328|32|32|Jorrassangue
L|amulet|1088|3296|32|32|Julgamento do Executor
L|amulet|800|3296|32|32|O Olho Inigualável de Beronath
L|amulet|2912|3296|32|32|Olho Celestial
L|amulet|3072|3296|32|32|Olho da Forja Noturna
L|amulet|2944|3296|32|32|Olho de Aeon
L|amulet|1792|3296|32|32|Olho de Uroboruuk
L|amulet|928|3296|32|32|Pedra Celestial de Halakor
L|amulet|1920|3296|32|32|Pestilência de Dreeg
L|amulet|3232|3296|32|32|Pingente da Tempestade de Fogo
L|amulet|1888|3296|32|32|Pingente do Cavaleiro Sangrento
L|amulet|288|3328|32|32|Pingente do Raio Etéreo
L|amulet|576|3328|32|32|Pingente Espreitanoite
L|amulet|1856|3296|32|32|Pingente Língua Geosa
L|amulet|1152|3296|32|32|Portador da Condenação
L|amulet|3008|3296|32|32|Pressário do Ascendente
L|amulet|2144|3296|32|32|Prisma Focalizador de Iskandra
L|amulet|1728|3296|32|32|Protetor do Assassino de Magos
L|amulet|3168|3296|32|32|Proteção da Caminhante dos Sonhos
L|amulet|1600|3296|32|32|Proteção da Guarda Pétrea
L|amulet|2464|3296|32|32|Proteção da Virtude
L|amulet|2496|3296|32|32|Proteção de Harra
L|amulet|2688|3296|32|32|Proteção do Bebedor de Sangueira
L|amulet|2368|3296|32|32|Proteção do Reino Despedaçado
L|amulet|2784|3296|32|32|Recompensa de Valdun
L|amulet|768|3328|32|32|Recordação da Pedra Marcada
L|amulet|256|3296|32|32|Recordação Invernal
L|amulet|3104|3296|32|32|Rocha de Apoclypton
L|amulet|1056|3296|32|32|Rubi Contaminado de Gar'dal
L|amulet|768|3296|32|32|Rubi Soberano da Dominação
L|amulet|1120|3296|32|32|Safira do Vidente da Tempestade
L|amulet|800|3328|32|32|Sussurrador do Véu
L|amulet|3040|3296|32|32|Talismã de Fenris
L|amulet|608|3328|32|32|Venofogo
L|amulet|2560|3296|32|32|Vetor do Senhor Infeccioso
L|amulet|1984|3296|32|32|Vingador de Cairn
L|amulet|2272|3296|32|32|Vontade da Lâmina
L|amulet|672|3296|32|32|Vontade de Bysmiel
L|amulet|2592|3296|32|32|Íris de Bysmiel
E|amulet|416|3296|32|32|Amuleto da Lâmina Venenosa
E|amulet|224|3296|32|32|Amuleto da Rejeição Ardente
E|amulet|608|3296|32|32|Amuleto da Tempestade Etérea
E|amulet|0|3296|32|32|Amuleto da Terra Abrasada
E|amulet|160|3296|32|32|Amuleto de Sarça
E|amulet|2752|3264|32|32|Amuleto do Olho
E|amulet|32|3296|32|32|Amuleto do Pestomante
E|amulet|3552|3296|32|32|Aperto do Ceifador
E|amulet|3232|3264|32|32|Avareza de Androneus
E|amulet|480|3296|32|32|Chama dos Justos
E|amulet|3424|3296|32|32|Chama-vida dos Rhowari
E|amulet|96|3296|32|32|Coragem do Antilâmina
E|amulet|2912|3264|32|32|Coração Definhado
E|amulet|448|3296|32|32|Eclipse Arcano
E|amulet|576|3296|32|32|Esmeralda Vinculativa de Mogdrogen
E|amulet|3136|3264|32|32|Essência de Beronath
E|amulet|64|3296|32|32|Fragmento Cerúleo
E|amulet|2720|3264|32|32|Fragmento da Deformação
E|amulet|544|3296|32|32|Fragmento de Callidor
E|amulet|352|3296|32|32|Fragmento do Comando
E|amulet|3488|3264|32|32|Gema do Evocador de Tempestades
E|amulet|3104|3264|32|32|Gema do Pai das Runas
E|amulet|3520|3296|32|32|Gema Trovejante
E|amulet|3424|3264|32|32|Gemas do Frio Arcano
E|amulet|3552|3264|32|32|Guarda da Donzela Escudeira
E|amulet|3200|3264|32|32|Lapis Lupus
E|amulet|640|3296|32|32|Lapis Mantichora
E|amulet|2656|3264|32|32|Lente de Maiven
E|amulet|2592|3264|32|32|Lua de Sangue
E|amulet|3392|3264|32|32|Necessidade Miserável
E|amulet|3584|3264|32|32|Núcleo Congelado
E|amulet|3456|3264|32|32|Olhar do Caos
E|amulet|3296|3264|32|32|Olho Invisual do Assassino Cego
E|amulet|2688|3264|32|32|Orgulho do Mestre Guerreiro
E|amulet|2784|3264|32|32|Patuá da Pedra Espiritual
E|amulet|2624|3264|32|32|Patuá do Diabo
E|amulet|3456|3296|32|32|Pedra Canalizadora Solar
E|amulet|3360|3296|32|32|Pedra da Guarda dos Rhowari
E|amulet|2944|3264|32|32|Pedra da Serenidade
E|amulet|3488|3296|32|32|Pedra do Ceifeiro
E|amulet|2880|3264|32|32|Pedra do Desmembrar
E|amulet|2816|3264|32|32|Pedra do Vórtice
E|amulet|448|3328|32|32|Pingente Arcano de Dreeg
E|amulet|384|3328|32|32|Pingente Campeão de Bysmiel
E|amulet|384|3296|32|32|Pingente da Alma
E|amulet|3328|3264|32|32|Pingente da Coroa Real
E|amulet|3584|3296|32|32|Pingente da Cólera Ubíqua
E|amulet|736|3328|32|32|Pingente da Terra dos Kurn
E|amulet|3360|3264|32|32|Pingente da Valentia
E|amulet|96|3328|32|32|Pingente das Lâminas da Seita
E|amulet|192|3328|32|32|Pingente Defensor de Malmouth
E|amulet|160|3328|32|32|Pingente Disforme de Malmouth
E|amulet|256|3328|32|32|Pingente do Céu do Wendigo
E|amulet|0|3328|32|32|Pingente do Evocador do Vazio
E|amulet|544|3328|32|32|Pingente do Vazio de Solael
E|amulet|480|3328|32|32|Pingente dos Espinhos Venenosos de Dreeg
E|amulet|64|3328|32|32|Pingente Manipulador da Seita
E|amulet|32|3328|32|32|Pingente Obscurecente da Seita
E|amulet|512|3328|32|32|Pingente Tempesfogo de Solael
E|amulet|128|3328|32|32|Pingente Tempestigador de Malmouth
E|amulet|416|3328|32|32|Pingente Velado de Bysmiel
E|amulet|224|3328|32|32|Pingente Vil do Wendigo
E|amulet|672|3328|32|32|Pingente Vil Kurn
E|amulet|704|3328|32|32|Pingente Vingativo Kurn
E|amulet|320|3296|32|32|Proteção Ancestral
E|amulet|3040|3264|32|32|Proteção Contra a Morte
E|amulet|3264|3264|32|32|Proteção do Arauto
E|amulet|3072|3264|32|32|Proteção do Aspirante
E|amulet|3392|3296|32|32|Rancor dos Rhowari
E|amulet|2976|3264|32|32|Rubi Choroso
E|amulet|2560|3264|32|32|Rubi de Alazra
E|amulet|3168|3264|32|32|Ruína de Nuram'Siin
E|amulet|2848|3264|32|32|Sussurros dos Mortos
E|amulet|3008|3264|32|32|Topázio com Runas de Gillad
L|medal|192|3264|32|32|Comenda de Albrecht
L|medal|3584|2272|32|32|Comenda de Serenir
L|medal|3584|2368|32|32|Comenda do Gildam Arcanum
L|medal|160|3264|32|32|Coração da Guardiã do Mundo
L|medal|2528|3232|32|32|Distintivo da Companhia Carmesim
L|medal|3424|3232|32|32|Distintivo da Maestria
L|medal|768|3232|32|32|Distintivo da Perseverança
L|medal|3296|3232|32|32|Distintivo dos Sonhos Infernais
L|medal|3584|1088|32|32|Eco do Rumor
L|medal|64|3264|32|32|Emblema do Cavaleiro Melancólico
L|medal|3584|2464|32|32|Estratagema de Markovian
L|medal|3584|1664|32|32|Fragmento da Angústia
L|medal|224|3264|32|32|Joia da Tempespresa
L|medal|3584|3232|32|32|Juramento Imorredouro
L|medal|3584|1632|32|32|Marca da Companhia Carmesim
L|medal|3584|2176|32|32|Marca da Divindade
L|medal|32|3264|32|32|Marca da Forja Noturna
L|medal|2368|3232|32|32|Marca da Impureza
L|medal|3584|2400|32|32|Marca da Lâmina Pavorosa
L|medal|3584|1984|32|32|Marca da Não Vida
L|medal|3584|1696|32|32|Marca da Primeira Tempestade
L|medal|1024|3264|32|32|Marca da Rainha das Sombras
L|medal|736|3264|32|32|Marca das Intenções Letais
L|medal|1088|3264|32|32|Marca das Sombras Ardentes
L|medal|3584|1856|32|32|Marca de Bysmiel
L|medal|3584|1824|32|32|Marca de Ghol
L|medal|0|3264|32|32|Marca de Jarldin
L|medal|3584|2304|32|32|Marca de Kalastor
L|medal|3584|2016|32|32|Marca de Korvaak
L|medal|3584|1888|32|32|Marca de Ludrigan
L|medal|1760|3232|32|32|Marca de N'erf
L|medal|1728|3232|32|32|Marca de Nerf
L|medal|3584|2240|32|32|Marca de Ulzuin
L|medal|128|3264|32|32|Marca de Zakull
L|medal|1056|3264|32|32|Marca do Antevidente
L|medal|3584|2208|32|32|Marca do Anátema
L|medal|1216|3264|32|32|Marca do Atemporal
L|medal|2112|3232|32|32|Marca do Ceifador Sanguinário
L|medal|3584|1920|32|32|Marca do Ciclone
L|medal|3584|2144|32|32|Marca do Consumo
L|medal|1248|3264|32|32|Marca do Engano do Sangue
L|medal|3584|2432|32|32|Marca do Frio Pavoroso
L|medal|3072|3232|32|32|Marca do Ilusionista
L|medal|3360|3232|32|32|Marca do Jubassangue
L|medal|3040|3232|32|32|Marca do Petrarca
L|medal|3456|3232|32|32|Marca do Piroclasma
L|medal|3392|3232|32|32|Marca do Proibido
L|medal|800|3264|32|32|Marca do Voraz
L|medal|3584|1952|32|32|Marca dos Desejos Calamitosos
L|medal|3584|2048|32|32|Marca dos Fins Sangrentos
L|medal|3584|2496|32|32|Marca dos Sonhos Obscuros
L|medal|96|3264|32|32|Memória da Caminhante dos Sonhos
L|medal|768|3264|32|32|O Capataz
L|medal|2912|3232|32|32|Selo Sangrento de Vermentranhas
L|medal|3520|3232|32|32|Sigilo de Sangue de Ch'thon
L|medal|3488|3232|32|32|Sigilo do Rei Urso
L|medal|3584|1728|32|32|Sigilo dos Infinitos
L|medal|2720|3232|32|32|Sigilo Profano do Pacto
L|medal|3584|2080|32|32|Talismã do Evocador de Feras
L|medal|3584|2112|32|32|Timbre da Fortitude Invernal
L|medal|3584|2336|32|32|Timbre do Bebedor de Putrefação
L|medal|3584|1792|32|32|Timbre do Chamado da Brasa
L|medal|3584|1760|32|32|Timbre do Guardião do Véu
L|medal|3552|3232|32|32|Timbre do Lobo Atroz
L|medal|2624|3232|32|32|Timbre do Vidente Flamejante
E|medal|2656|3232|32|32|Comenda Luminari
E|medal|2144|3232|32|32|Coração Carmesim
E|medal|288|3264|32|32|Distintivo da Geada do Diabo
E|medal|608|3264|32|32|Distintivo da Profanação de Malmouth
E|medal|2048|3232|32|32|Distintivo da Tenacidade
E|medal|256|3264|32|32|Distintivo das Chamas do Diabo
E|medal|320|3264|32|32|Distintivo do Veneno do Diabo
E|medal|640|3264|32|32|Distintivo dos Elementos de Malmouth
E|medal|2304|3232|32|32|Estrela da Vanguarda
E|medal|448|3264|32|32|Estrela de Guerra dos Escolhidos
E|medal|480|3264|32|32|Estrela do Trovão dos Escolhidos
E|medal|3168|3232|32|32|Estrela dos Céus Congelados
E|medal|512|3264|32|32|Estrela dos Escolhidos Conspurcada
E|medal|3104|3232|32|32|Estrela Negra do Engano
E|medal|3264|3232|32|32|Estrela Venerada do Mirmidão
E|medal|2752|3232|32|32|Fita da Valentia
E|medal|2176|3232|32|32|Insígnia da Justiça
E|medal|2784|3232|32|32|Insígnia do Encantador
E|medal|672|3264|32|32|Marca Contaminada do Wendigo
E|medal|928|3264|32|32|Marca da Chama Negra de Dreeg
E|medal|3232|3232|32|32|Marca da Determinação Veemente
E|medal|3008|3232|32|32|Marca da Lamúria da Morte
E|medal|832|3264|32|32|Marca da Manipulação de Bysmiel
E|medal|960|3264|32|32|Marca da Matança de Solael
E|medal|2560|3232|32|32|Marca da Miséria Infernal
E|medal|3136|3232|32|32|Marca da Ninfa
E|medal|1120|3264|32|32|Marca da Vingança Kurn
E|medal|2592|3232|32|32|Marca da Vontade de Pedra
E|medal|416|3264|32|32|Marca das Lâminas da Legião
E|medal|544|3264|32|32|Marca das Lâminas da Seita
E|medal|2976|3232|32|32|Marca das Mentiras Angustiadas
E|medal|864|3264|32|32|Marca das Tempestades de Bysmiel
E|medal|1152|3264|32|32|Marca das Tempestades Kurn
E|medal|704|3264|32|32|Marca Defensora do Wendigo
E|medal|576|3264|32|32|Marca do Arcano da Seita
E|medal|2080|3232|32|32|Marca do Assassino de Feras
E|medal|2464|3232|32|32|Marca do Guarda-cofre
E|medal|2208|3232|32|32|Marca do Médico de Combate
E|medal|992|3264|32|32|Marca do Sangue de Solael
E|medal|1184|3264|32|32|Marca do Sangue Kurn
E|medal|352|3264|32|32|Marca do Tece-feitiços da Legião
E|medal|384|3264|32|32|Marca do Vazio da Legião
E|medal|896|3264|32|32|Marca dos Calafrios de Dreeg
E|medal|2880|3232|32|32|Marca dos Deuses Falsos
E|medal|2400|3232|32|32|Marca dos Espíritos Esquecidos
E|medal|2240|3232|32|32|Marca dos Juramentos
E|medal|2432|3232|32|32|Marca dos Juramentos Quebrados
E|medal|3328|3232|32|32|Marca dos Surtos Primordiais
E|medal|2336|3232|32|32|Marca Solene
E|medal|2272|3232|32|32|Sigilo Arcano
E|medal|2848|3232|32|32|Sigilo da Tempestade
E|medal|2944|3232|32|32|Sigilo de Mogdrogen
E|medal|2816|3232|32|32|Sigilo do Herege
E|medal|2688|3232|32|32|Sinal do Boticário
E|medal|2496|3232|32|32|Timbre do Sanctus
E|medal|3200|3232|32|32|Volcanum
`;
