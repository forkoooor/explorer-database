while true
do
    node dune/get_stolen_tokens.js 
    node ./gen.js
    git pull
    git add .
    git commit -m "update"
    git push
    sleep 300
done