// 画面の部品を取得
//ポケモン図鑑データ
/*const pokedex = [
    {name: "ガブリアス", hp:108, attack:130, defence:95, spAttack:80, spDefence:85, speed:102, type1: "ドラゴン", type2: "じめん"},
    {name: "ピカチュウ", hp:35, attack:55, defence:40, spAttack:50, spDefence:50, speed:90, type1: "でんき", type2: "なし"},
    {name: "ハピナス", hp:255, attack:10, defence:10, spAttack:75, spDefence:135, speed:55, type1: "ノーマル", type2: "なし"},
    {name: "マリルリ", hp:100, attack:50, defence:80, spAttack:60, spDefence:80, speed:50, type1: "みず", type2: "フェアリー"},
    {name: "カビゴン", hp:160, attack:110, defence:65, spAttack:65, spDefence:110, speed:30, type1: "ノーマル", type2: "なし"}
];*/

let pokedex = [];
let moveDex = [];

// CSVのテキストをポケモンの配列に変換する関数
function parsePokemonCSV(csvText) {
    const lines = csvText.split('\n');
    const result = [];
    
    // 1行目（ヘッダー）を飛ばすために i = 1 からスタート
    for (let i = 1; i < lines.length; i++) {
        // 空の行は無視
        if (!lines[i].trim()) continue; 
        
        // カンマで区切って配列（data）にする
        const data = lines[i].split(',');

        // ① 名前にフォルムを合体させる処理
        let pokemonName = data[1];
        let formName = data[2];
        
        // フォルムが「通常」以外、かつ空欄ではない場合だけ、(メガフシギバナ) のように後ろにくっつける
        if (formName && formName !== "通常" && formName !== "") {
            pokemonName = pokemonName + "(" + formName + ")";
        }

        // 必要な列をすべて拾う
        result.push({
            name: pokemonName,         // フォルム付きの名前
            type1: data[3],            // タイプ1
            type2: data[4] ? data[4].trim() : "なし", // タイプ2（空の場合は「なし」）
            hp: Number(data[5]),       // HP
            attack: Number(data[6]),   // 攻撃
            defence: Number(data[7]),  // 防御
            spAttack: Number(data[8]), // 特攻
            spDefence: Number(data[9]),// 特防
            speed: Number(data[10]),   // 素早さ
            // 特性の追加
            // （データがない空欄の場合は "" にする、改行コードのゴミは .trim() で消す）
            ability1: data[11] ? data[11].trim() : "",
            ability2: data[12] ? data[12].trim() : "",
            hiddenAbility: data[13] ? data[13].trim() : ""
        });
    }
    return result;
}

// CSVのテキストを技の配列に変換する関数
function parseMoveCSV(csvText) {
    //ここで、新しく作った本格的なCSV解析関数を呼び出します
    const rows = parseCSVRobust(csvText);
    const result = [];
    
    // 1行目（ヘッダー）を飛ばす
    for (let i = 1; i < rows.length; i++) {
        const data = rows[i];
        
        // データが足りない行や、名前が空っぽの行は無視する
        if (data.length < 4 || !data[0].trim()) continue;

        // 分類（ぶつり/とくしゅ）を変換
        let categoryCode = "";
        if (data[2] === "ぶつり") {
            categoryCode = "atk";
        } else if (data[2] === "とくしゅ") {
            categoryCode = "spAtk";
        } else {
            categoryCode = "status"; 
        }

        result.push({
            name: data[0],             // 名前
            type: data[1],             // タイプ
            category: categoryCode,    // 分類
            power: Number(data[3]) || 0 // 威力（空欄や特殊な文字なら 0 にする）
        });
    }
    return result;
}

// ② 英語の文章内の「改行」や「カンマ」に騙されない、超・強力なCSV解析関数
function parseCSVRobust(text) {
    let result = [];
    let row = [];
    let cell = '';
    let insideQuotes = false; // 今、" " の中にいるかどうかを判定するスイッチ

    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        
        if (char === '"') {
            if (insideQuotes && text[i + 1] === '"') {
                cell += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes; // スイッチのON/OFFを切り替え
            }
        } else if (char === ',' && !insideQuotes) {
            // " " の外にあるカンマなら、次の列へ
            row.push(cell);
            cell = '';
        } else if (char === '\n' && !insideQuotes) {
            // " " の外にある改行なら、次の行（次の技）へ
            row.push(cell);
            result.push(row);
            row = [];
            cell = '';
        } else if (char === '\r' && !insideQuotes) {
            if (text[i + 1] === '\n') i++; // Windowsの改行コード対策
            row.push(cell);
            result.push(row);
            row = [];
            cell = '';
        } else {
            cell += char; // 普通の文字はそのまま追加
        }
    }
    // 最後の行を追加
    if (cell || row.length > 0) {
        row.push(cell);
        result.push(row);
    }
    return result;
}
// 外部ファイル（CSV）を読み込む非同期処理
async function loadDataAndInit() {
    try {
        // fetchを使ってファイルを読み込む
        const pokeResponse = await fetch('ポケモンリスト.csv');
        const pokeText = await pokeResponse.text();
        pokedex = parsePokemonCSV(pokeText);

        const moveResponse = await fetch('技一覧.csv');
        const moveText = await moveResponse.text();
        moveDex = parseMoveCSV(moveText);

        // 読み込みが終わってから、セレクトボックスを作る処理を呼ぶ
        setupSelectBoxes(); 
    } catch (error) {
        console.error("データの読み込みに失敗しました。ローカルサーバー環境で実行していますか？", error);
    }
}

// 既存の「セレクトボックスにデータを入れる処理」を関数で囲む
function setupSelectBoxes() {
    // （ここに既存の for(let i=0; i<pokedex.length...) の処理をごっそり移動させます）
}

// ページが開かれたら読み込みスタート！
loadDataAndInit();


// セレクトボックスを更新する共通関数
function updateSelectBox(selectElement, dataArray, keyword) {
    selectElement.innerHTML = '<option value="">選択してください</option>';
    
    for (let i = 0; i < dataArray.length; i++) {
        let dataName = dataArray[i].name;
        // キーワードが含まれている場合だけ選択肢に追加する
        if (dataName.includes(keyword)) {
            let option = document.createElement("option");
            option.text = dataName;
            option.value = i; // 元の配列の番号(index)をそのまま保持する
            selectElement.appendChild(option);
        }
    }
}

// 文字が入力されるたびに（inputイベント）絞り込みを実行する
atkSearchInput.addEventListener("input", function() {
    updateSelectBox(attackerSearch, pokedex, this.value);
});

defSearchInput.addEventListener("input", function() {
    updateSelectBox(defenderSearch, pokedex, this.value);
});

moveSearchInput.addEventListener("input", function() {
    updateSelectBox(moveSearch, moveDex, this.value);
});


/*const moveDex = [
    {name:"アクアジェット", power:40, type:"みず", category:"atk"},
    {name:"かえんほうしゃ", power:90, type:"ほのお", category:"spAtk"},
    {name:"れいとうビーム", power:90, type:"こおり", category:"spAtk"}
]; */

// 検索ボックスの要素を取得
const atkSearchInput = document.getElementById("atkSearchInput");
const defSearchInput = document.getElementById("defSearchInput");
const moveSearchInput = document.getElementById("moveSearchInput");

const atkEvInput = document.getElementById("atkEvInput");
const defEvInput = document.getElementById("defEvInput");
const hpEvInput = document.getElementById("hpEvInput");

const attackTypeSelect = document.getElementById("attackTypeSelect");
const defenceTypeSelect = document.getElementById("defenceTypeSelect");
const attackerSearch = document.getElementById("attackerSearch");
const defenderSearch = document.getElementById("defenderSearch");
const atkRankSelect = document.getElementById("atkRankSelect");
const defRankSelect = document.getElementById("defRankSelect");
const situationSelect = document.getElementById("situationSelect"); //状態異常
const atkTraitSelect = document.getElementById("atkTraitSelect");
const defTraitSelect = document.getElementById("defTraitSelect");
const barrierSelect = document.getElementById("barrierSelect"); //壁
const moveSearch = document.getElementById("moveSearch");
const hpInput = document.getElementById("hpInput");
const attackInput = document.getElementById("attackInput");
const powerInput = document.getElementById("powerInput");
const defenceInput = document.getElementById("defenceInput");
const speedInput1 = document.getElementById("speedInput1");
const speedInput2 = document.getElementById("speedInput2");
const stabCheck = document.getElementById("stabCheck");
const fieldCheck = document.getElementById("fieldCheck");
const vitalCheck = document.getElementById("vitalCheck");
const itemSelect = document.getElementById("itemSelect");
const typeMatch = document.getElementById("typeMatch");
const typeMatch2 = document.getElementById("typeMatch2");
const calcButton = document.getElementById("calcButton");
const resultArea = document.getElementById("resultArea");


//セレクトボックスにデータを自動で入れる処理
for(let i = 0; i < pokedex.length; i++){
    let pokemon = pokedex[i];

    //<option>タグをプログラムで作る
    let atkOption = document.createElement("option");

    //画面に表示する文字
    atkOption.text = pokemon.name + "(A:" + pokemon.attack +  " C:" + pokemon.spAttack + ")";
    atkOption.value = i;
    attackerSearch.appendChild(atkOption);

    let defOption = document.createElement("option");

    defOption.text = pokemon.name + "(H:" + pokemon.hp + " B:" + pokemon.defence +  " D:" + pokemon.spDefence + ")";
    defOption.value = i;
    defenderSearch.appendChild(defOption);
}

for(let i = 0; i < moveDex.length; i++){
    let move = moveDex[i];

    let moveOption = document.createElement("option");

    moveOption.text = move.name;
    moveOption.value = i;

    moveSearch.appendChild(moveOption);
}


moveSearch.addEventListener("change", function(){
    let index = moveSearch.value;

    if (index !== ""){
        let selectedMove = moveDex[index];

        powerInput.value = selectedMove.power;

        if(selectedMove.category === "atk"){
            attackTypeSelect.value = "attack";
            defenceTypeSelect.value = "defence";
        } else if (selectedMove.category === "spAtk"){
            attackTypeSelect.value = "spAttack";
            defenceTypeSelect.value = "spDefence";
        }

        updateAttacker();
        updateDefender();
    }
});

//攻撃側のポケモンが選ばれたときの処理
function updateAttacker(){

        let index = attackerSearch.value;

    if(index !== ""){

        let selectedPokemon = pokedex[index]
        let statType = attackTypeSelect.value
        let baseAttack = selectedPokemon[statType]

        let baseSpeed1 = selectedPokemon.speed;


        let level = 50;
        let iv = 31; //個体値
        let ev = 252;  //努力値
        let nature = 1.1; //性格補正

        //ステータス計算(ポケモンチャンピオンズ以外)
        let evCalc = Math.floor(ev / 4);
        let coreStat = Math.floor((baseAttack * 2 + iv + evCalc) * level / 100);
        let finalStat = Math.floor((coreStat + 5) * nature);

        //特性の処理
        let atkTraitSelect = document.getElementById("atkTraitSelect");

        if(atkTraitSelect.value === "1" && statType === "attack"){
            finalStat = Math.floor(finalStat * 2);
        }

        //let atkRank = Number(atkRankSelect.value); // 画面からランクの値を取得
        //let rankMod = getRankModifier(atkRank);    // 倍率を計算
        //finalStat = Math.floor(finalStat * rankMod); // 実数値をランク補正倍する（端数切捨て）

        /*let atkEv = Number(atkEvInput.value); 
        // ★チャンピオンズ仕様: 基礎計算の後に直接ポイント(0~32)を足す
        let coreStat = Math.floor((baseAttack * 2 + 31) * 50 / 100) + 5 + atkEv;
        let finalStat = Math.floor(coreStat * nature);*/


        //計算した実数値を、画面のテキストボックスに直接書き込む
        attackInput.value = finalStat;


        let speedEvCalc1 = Math.floor(252 / 4);
        let finalSpeed1 = Math.floor((baseSpeed1 * 2 + 31 + speedEvCalc1) * level / 100) + level + 10;
        speedInput1.value = finalSpeed1;



    }
}

//atkEvInput.addEventListener("change", updateAttacker);

attackerSearch.addEventListener("change", updateAttacker);
attackTypeSelect.addEventListener("change", updateAttacker);

// 攻撃の種類（物理/特殊）を手動で変えたら、防御側も自動で合わせる！
attackTypeSelect.addEventListener("change", function() {
    
    if (attackTypeSelect.value === "attack") {
        // 攻撃側が「物理」になったら、防御側も「物理受け（防御）」にする
        defenceTypeSelect.value = "defence";
        
    } else if (attackTypeSelect.value === "spAttack") {
        // 攻撃側が「特殊」になったら、防御側も「特殊受け（特防）」にする
        defenceTypeSelect.value = "spDefence";
    }

    // 防御側のセレクトボックスをプログラムで切り替えたので、
    // 「実数値を計算し直して！」という命令を忘れずに出してあげる
    updateDefender();
});

atkTraitSelect.addEventListener("change", updateAttacker);



function updateDefender(){

    let index = defenderSearch.value;

    if(index !== ""){

        let selectedPokemon = pokedex[index];

        let defStatType = defenceTypeSelect.value


        let baseHP = selectedPokemon.hp;
        let baseDef = selectedPokemon[defStatType];

        let baseSpeed2 = selectedPokemon.speed;


        let level = 50;
        let iv = 31;
        let ev = 252;
        let nature = 1.1;

        /*let defEvCalc = Math.floor(ev / 4);
        let defCore = Math.floor((baseDef * 2 + iv + defEvCalc) * level / 100);
        let finalDef = Math.floor((defCore + 5) * nature);*/

        //let defRank = Number(defRankSelect.value); // 画面からランクの値を取得
        //let rankMod = getRankModifier(defRank);    // 倍率を計算
        //finalDef = Math.floor(finalDef * rankMod); // 実数値をランク補正倍する

        let defEv = Number(defEvInput.value);
        let defCore = Math.floor((baseDef * 2 + 31) * 50 / 100) + 5 + defEv;
        let finalDef = Math.floor(defCore * nature);
        defenceInput.value = finalDef;

        /*let hpEv = Number(hpEvInput.value);
        HPは「レベル(50) + 10」を足す仕様なので 60 になります
        let finalHP = Math.floor((baseHP * 2 + 31) * 50 / 100) + 60 + hpEv; 
        hpInput.value = finalHP;*/

        let hpEvCalc = Math.floor(252 / 4);
        let finalHP = Math.floor((baseHP * 2 + 31 + hpEvCalc) * level / 100) + level + 10;
        hpInput.value = finalHP;

        let speedEvCalc2 = Math.floor(252 / 4);
        let finalSpeed2 = Math.floor((baseSpeed2 * 2 + 31 + speedEvCalc2) * level / 100) + level + 10;
        speedInput2.value = finalSpeed2;



    }
}


defenderSearch.addEventListener("change", updateDefender);
defenceTypeSelect.addEventListener("change", updateDefender);
/*defEvInput.addEventListener("change", updateDefender);
hpEvInput.addEventListener("change", updateDefender); ポケモンチャンピオンズ形式 */


//タイプ相性関数
function checkTypeMatch(defType, moveType){
   /*if(moveType === "みず"){
        if(defType === "ほのお" || defType === "じめん")return 2.0;
        if(defType === "みず" || defType === "くさ" || defType === "ドラゴン")return 0.5;
    }*/

// 相手が単タイプで、type2が「なし」の場合は1.0倍として返す        
if (defType === "なし" || !defType || !moveType) {
        return 1.0;
    }

    // 全18タイプの相性データ
    // 左側が「技のタイプ」、右側が「受ける側のタイプ : 倍率」です
    // ※ここに書いていない組み合わせは、すべて自動的に「1.0倍」になります
    const typeChart = {
        "ノーマル": { "いわ": 0.5, "はがね": 0.5, "ゴースト": 0 },
        "ほのお":   { "くさ": 2.0, "こおり": 2.0, "むし": 2.0, "はがね": 2.0, "ほのお": 0.5, "みず": 0.5, "いわ": 0.5, "ドラゴン": 0.5 },
        "みず":     { "ほのお": 2.0, "じめん": 2.0, "いわ": 2.0, "みず": 0.5, "くさ": 0.5, "ドラゴン": 0.5 },
        "でんき":   { "みず": 2.0, "ひこう": 2.0, "でんき": 0.5, "くさ": 0.5, "ドラゴン": 0.5, "じめん": 0 },
        "くさ":     { "みず": 2.0, "じめん": 2.0, "いわ": 2.0, "ほのお": 0.5, "くさ": 0.5, "どく": 0.5, "ひこう": 0.5, "むし": 0.5, "ドラゴン": 0.5, "はがね": 0.5 },
        "こおり":   { "くさ": 2.0, "じめん": 2.0, "ひこう": 2.0, "ドラゴン": 2.0, "ほのお": 0.5, "みず": 0.5, "こおり": 0.5, "はがね": 0.5 },
        "かくとう": { "ノーマル": 2.0, "こおり": 2.0, "いわ": 2.0, "あく": 2.0, "はがね": 2.0, "どく": 0.5, "ひこう": 0.5, "エスパー": 0.5, "むし": 0.5, "フェアリー": 0.5, "ゴースト": 0 },
        "どく":     { "くさ": 2.0, "フェアリー": 2.0, "どく": 0.5, "じめん": 0.5, "いわ": 0.5, "ゴースト": 0.5, "はがね": 0 },
        "じめん":   { "ほのお": 2.0, "でんき": 2.0, "どく": 2.0, "いわ": 2.0, "はがね": 2.0, "くさ": 0.5, "むし": 0.5, "ひこう": 0 },
        "ひこう":   { "くさ": 2.0, "かくとう": 2.0, "むし": 2.0, "でんき": 0.5, "いわ": 0.5, "はがね": 0.5 },
        "エスパー": { "かくとう": 2.0, "どく": 2.0, "エスパー": 0.5, "はがね": 0.5, "あく": 0 },
        "むし":     { "くさ": 2.0, "エスパー": 2.0, "あく": 2.0, "ほのお": 0.5, "かくとう": 0.5, "どく": 0.5, "ひこう": 0.5, "ゴースト": 0.5, "はがね": 0.5, "フェアリー": 0.5 },
        "いわ":     { "ほのお": 2.0, "こおり": 2.0, "ひこう": 2.0, "むし": 2.0, "かくとう": 0.5, "じめん": 0.5, "はがね": 0.5 },
        "ゴースト": { "エスパー": 2.0, "ゴースト": 2.0, "あく": 0.5, "ノーマル": 0 },
        "ドラゴン": { "ドラゴン": 2.0, "はがね": 0.5, "フェアリー": 0 },
        "あく":     { "エスパー": 2.0, "ゴースト": 2.0, "かくとう": 0.5, "あく": 0.5, "フェアリー": 0.5 },
        "はがね":   { "こおり": 2.0, "いわ": 2.0, "フェアリー": 2.0, "ほのお": 0.5, "みず": 0.5, "でんき": 0.5, "はがね": 0.5 },
        "フェアリー":{ "かくとう": 2.0, "ドラゴン": 2.0, "あく": 2.0, "ほのお": 0.5, "どく": 0.5, "はがね": 0.5 }
    };

    // 選ばれた技のタイプが表に存在し、さらに防御側のタイプに対する倍率が設定されているかチェック
    if (typeChart[moveType] && typeChart[moveType][defType] !== undefined) {
        // 設定されていれば、その倍率を返す
        return typeChart[moveType][defType];
    }

    // 表にない組み合わせ（例：みず技 → ノーマルタイプ 等）は、すべて等倍（1.0倍）
    return 1.0;

}

// ランク値（-6〜6）を受け取って、倍率を返す関数
function getRankModifier(rank) {
    if (rank >= 0) {
        return (2 + rank) / 2;       // 上昇のとき
    } else {
        return 2 / (2 - rank);       // 下降のとき（マイナスを引くので分母がプラスになります）
    }
}

// ダメージ計算の関数
// 威力, 攻撃, 防御, タイプ一致, 急所, 相性, 持ち物
function calculateDamage(power, attack, defence, atkRank, defRank, isStab, vital, modifier, item, field, defTrait, moveType, weather, situationModifier, statType, barrier){
    if(field === true){
        power = Math.floor(power * 1.3);
    }

    if(weather === "sun"){
        if(moveType === "ほのお") power = Math.floor(power * 1.5)
    }

    let tempAtkRank = atkRank;
    let tempDefRank = defRank;

        if(vital === true){

        // 急所のとき：自分に不利なランクを無視する
        
        if (tempAtkRank < 0) {
            tempAtkRank = 0; // 攻撃側が下がっていても、ランク0として扱う
        }
        
        if (tempDefRank > 0) {
            tempDefRank = 0; // 防御側が上がっていても、ランク0として扱う
        }
    }

    // ここで初めてランク倍率を計算し、ステータスに適用する
    let atkRankMod = getRankModifier(tempAtkRank); // getRankModifier関数は前回作ったものを使用
    let defRankMod = getRankModifier(tempDefRank);

    // 補正後の最終的なステータス実数値
    let finalAtk = Math.floor(attack * atkRankMod);
    let finalDef = Math.floor(defence * defRankMod);

    // 1. 基本ダメージ計算（レベル50固定）


    let step2 = Math.floor(22 * power * finalAtk / finalDef);    
    let baseDamage = Math.floor(step2 / 50) + 2;

    // やけどの処理
    // 物理攻撃（attack）で、かつ、やけど（0.5）のときだけ半減する
    // -------------------------------------------------
    if (statType === "attack" && situationModifier === 0.5) {
        // ※「根性」や「からげんき」を実装する場合はここに例外条件を足します
        baseDamage = Math.floor(baseDamage * 0.5);
    }

    if (vital === false) { 
        if (statType === "attack" && barrier === "reflect") {
            // 物理技 かつ リフレクターのとき半減
            baseDamage = Math.floor(baseDamage * 0.5); 
        } else if (statType === "spAttack" && barrier === "lightScreen") {
            // 特殊技 かつ ひかりのかべのとき半減
            baseDamage = Math.floor(baseDamage * 0.5); 
        }
    }

    if(defTrait === "1" && (moveType === "ほのお" || moveType === "こおり") ){
    baseDamage = Math.floor(baseDamage / 2);
    }

    //急所
    if(vital === true){
        baseDamage = Math.floor(baseDamage * 1.5);
    }

    // 2. 乱数（0.85 〜 1.0）を掛ける ★相性などの「前」に計算します！
    let minDamage = Math.floor(baseDamage * 0.85);
    let maxDamage = Math.floor(baseDamage * 1.0); 

    // 3. タイプ一致 (1.5倍)
    if (isStab === true) {
        minDamage = Math.floor(minDamage * 1.5);
        maxDamage = Math.floor(maxDamage * 1.5);
    }

    // 4. タイプ相性補正
    minDamage = Math.floor(minDamage * modifier);
    maxDamage = Math.floor(maxDamage * modifier);

    // 5. 持ち物補正（タイプ強化）
    if (item === "typeBoost") {
        minDamage = Math.floor(minDamage * 1.2);
        maxDamage = Math.floor(maxDamage * 1.2);
    }

    // 結果を配列にして返す
    return [minDamage, maxDamage]; 
}


//atkRankSelect.addEventListener("change", updateAttacker);
//defRankSelect.addEventListener("change", updateDefender);



// ボタンが押されたときの処理
calcButton.addEventListener("click", function() {
    // 入力された値を取得（数値に変換）
    let attack = Number(attackInput.value);
    let power = Number(powerInput.value);
    let defence = Number(defenceInput.value);
    //let modifier = Number(typeMatch.value);

    // やけどの倍率と、物理/特殊の判定を取得
    let situationModifier = Number(situationSelect.value); 
    let statType = attackTypeSelect.value; // "attack"（物理）か "spAttack"（特殊）かが入っている

    //画面のセレクトボックスからランクの「値」を取得
    let atkRank = Number(atkRankSelect.value); 
    let defRank = Number(defRankSelect.value);

// 【計算ボタンクリックの処理内】
// 技のタイプを取得する
    let moveIndex = moveSearch.value;
    let moveType = "";
    if(moveIndex !== ""){
    moveType = moveDex[moveIndex].type;
    }    

// その後にタイプ相性の計算をする（関数名と引数の順番を修正）
    let defIndex = defenderSearch.value;
    let defType1 = pokedex[defIndex].type1;
    let defType2 = pokedex[defIndex].type2;

// checkTypeMatch(防御側のタイプ, 技のタイプ) の順で渡す
    let mod1 = checkTypeMatch(defType1, moveType); 
    let mod2 = checkTypeMatch(defType2, moveType);
    let modifier = mod1 * mod2;

    let defenderHP = Number(hpInput.value);

    // チェックボックスの状態を取得
    let field = fieldCheck.checked;
    let isStab = stabCheck.checked;
    let vital  = vitalCheck.checked;

    let defTrait = document.getElementById("defTraitSelect").value;

    // 壁の状態を取得
    let barrier = barrierSelect.value;

    let weather = document.getElementById("weatherSelect").value; // 天候の選択状態を取得（id="weatherSelect" から取得すると仮定）

    // 持ち物の選択状態を取得する
    let item = itemSelect.value;

    // 計算関数を呼び出す
    // 関数で定義した順番通りにデータを渡す！
    let damageRange = calculateDamage(power, attack,  defence, atkRank, defRank, isStab, vital, modifier, item, field, defTrait, moveType, weather, situationModifier, statType, barrier);
    let minDamage = damageRange[0];
    let maxDamage = damageRange[1];


let minPercent = (minDamage / defenderHP) * 100;
minPercent = Math.floor(minPercent * 100) / 100;
let maxPercent = (maxDamage / defenderHP) * 100;
maxPercent = Math.floor(maxPercent * 100) / 100;


let hitCountText = "";
if(minPercent >= 100){
    hitCountText = "（確定1発）";
} else if(maxPercent >= 100){
    hitCountText = "（乱数1発）";
} else if(minPercent >= 50){
hitCountText = "（確定2発）";
} else if(maxPercent >= 50){
hitCountText = "（乱数2発）";
}else if(minPercent >= 33.3){
hitCountText = "（確定3発）";
}else {
hitCountText = "（4発以上）";
}
    let resultText = "ダメージ:" + minDamage + " ～ " + maxDamage + "<br>";   
    resultText += "割合" + minPercent + "% ～ " + maxPercent + "%<br>";
    resultText += "目安:" + hitCountText;

    resultArea.innerHTML = resultText;
});

// アプリ起動時に、サーバー上にあるCSVを自動で読み込む関数
async function initApp() {
    try {
        // 1. ポケモンのCSVを自動取得
        const pokeResponse = await fetch('./pokemons.csv');
        const pokeText = await pokeResponse.text();
        pokedex = parsePokemonCSV(pokeText);

        // 2. 技のCSVを自動取得
        const moveResponse = await fetch('./moves.csv');
        const moveText = await moveResponse.text();
        moveDex = parseMoveCSV(moveText);

        // 3. セレクトボックスの初期表示（空文字で検索＝全件表示）
        updateSelectBox(attackerSearch, pokedex, "");
        updateSelectBox(defenderSearch, pokedex, "");
        updateSelectBox(moveSearch, moveDex, "");
        
        console.log("データの読み込みが完了しました！");
    } catch (error) {
        console.error("データの読み込みに失敗しました:", error);
    }
}

// ページが開かれたら自動読み込みスタート！
initApp();


/*const pokeCsvInput = document.getElementById("pokeCsvInput");

ファイルが選択されたら実行される処理(web上での場合)
pokeCsvInput.addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    // ファイルの読み込みが終わった時の処理
    reader.onload = function(event) {
        const text = event.target.result;
        
        // さっき作った関数でCSVを変換
        pokedex = parsePokemonCSV(text);
        
        // セレクトボックスの中身を一旦空にする
        attackerSearch.innerHTML = '<option value="">選択してください</option>';
        defenderSearch.innerHTML = '<option value="">選択してください</option>';
        
        // 新しいデータでセレクトボックスを作り直す
        for(let i = 0; i < pokedex.length; i++){
            let pokemon = pokedex[i];
            let atkOption = document.createElement("option");
            atkOption.text = pokemon.name;
            atkOption.value = i;
            attackerSearch.appendChild(atkOption);

            let defOption = document.createElement("option");
            defOption.text = pokemon.name;
            defOption.value = i;
            defenderSearch.appendChild(defOption);
        }
    };
    
    // 文字化けする場合は 'UTF-8' の部分を 'Shift_JIS' に変えてみてください
    reader.readAsText(file, 'Shift_JIS'); 
});

// HTMLから技のファイル読み込みボタンを取得
const moveCsvInput = document.getElementById("moveCsvInput");

// ファイルが選択されたら実行される処理
moveCsvInput.addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    // ファイルの読み込みが終わった時の処理
    reader.onload = function(event) {
        const text = event.target.result;
        
        // CSVを変換して、moveDexを上書きする
        moveDex = parseMoveCSV(text);
        
        // 技のセレクトボックスの中身を一旦空にする
        moveSearch.innerHTML = '<option value="">選択してください</option>';
        
        // 新しいデータでセレクトボックスを作り直す
        for(let i = 0; i < moveDex.length; i++){
            let move = moveDex[i];
            
            let moveOption = document.createElement("option");
            moveOption.text = move.name;
            moveOption.value = i;
            
            moveSearch.appendChild(moveOption);
        }
    };
    
    // 文字化けする場合は 'UTF-8' の部分を 'Shift_JIS' に変えてみてください
    reader.readAsText(file, 'Shift_JIS'); 
});*/
