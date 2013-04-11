'use strict';

function DeckBuilder($scope, $http, $log) {
    $scope.searchText = "";
    $scope.searchResults = [];
    $scope.decks = [];
    $scope.deck = {};
    $scope.deck.cards = [];
    $scope.showDeckList = true;
    $scope.showDeck = false;
    $scope.showPrint = false;
    $scope.cardToViewSuggestions = [];

    $scope.removeFromDeck = function(card) {
        var indexToRemove = -1;
        for (var i = 0; i < $scope.deck.cards.length; i++) {
            if (card.name === $scope.deck.cards[i].name) {
                indexToRemove = i;
            }
        }

        if (indexToRemove >= 0) {
            $scope.deck.cards.splice(indexToRemove, 1);
        }
    }

    $scope.viewDeckList = function() {
        $scope.showDeckList = true;
        $scope.showDeck = false;
        $scope.showPrint = false;
    }

    $scope.viewDeck = function(deck) {
        $scope.deck = deck;
        $scope.showDeckList = false;
        $scope.showDeck = true;
        $scope.showPrint = false;
    }

    $scope.print = function() {
        $scope.printcards = [];
        for (var i = 0; i < $scope.deck.cards.length; i++) {
            var card = $scope.deck.cards[i];
            var quantity = card.quantity;
            for (var j = 0; j < quantity; j++) {
                $scope.printcards.push(card);
            }
        }

        $scope.showDeckList = false;
        $scope.showDeck = false;
        $scope.showPrint = true;
    }

    $scope.searchByName = function() {

        var url = "/search";
        var params = {};
        params.nameFragment = $scope.searchText;
        params.dataType = "json";

        $http.get(url, {params: params}).success(function(xhr) {
            $log.log("Search results: " + angular.toJson(xhr));
            $scope.searchResults = [];
            var results = xhr.Results
            for (var i = 0; i < results.length; i++) {
                var searchResult = {};
                searchResult.name = results[i].Name;
                searchResult.quantity = 1;
                $scope.searchResults.push(searchResult);

            }
        });

    }

    $scope.addToDeck = function(result) {
        var deckObj = {};
        deckObj.name = result.name;
        deckObj.quantity = result.quantity;
        $scope.deck.cards.push(deckObj);
    }

    $scope.viewCard = function(searchResult) {
        $log.log("View card called on: " + angular.toJson(searchResult));
        var cardName = searchResult.name.toUpperCase();
        $scope.findRelatedCards(cardName);
        while (cardName.indexOf(" ") > 0) {
            cardName = cardName.replace(" ", "_");
        }
        cardName += ".jpg";
        $log.log("viewing card: " + cardName);
        $scope.cardToView = "/mtgImages/" + cardName;

    }

    $scope.findRelatedCards = function(cardName) {
        $http.get("/card/" + cardName + "/related").success(function(xhr) {
            
            var results = [];
            for(var i =0; i < xhr.length; i++){
                var resultObj = {};
                resultObj.quantity = 1;
                resultObj.count = xhr[i]["r.count"];
                resultObj.name = xhr[i]["x.name"];
                results.push(resultObj);
            }
            results.sort(function(a,b){
                return (b.count - a.count);
            });
            console.log("cards related to " + cardName + ": " + angular.toJson(results));
            $scope.cardToViewSuggestions = results;
        });
    }

    $scope.saveDeck = function() {
        $http.post("/deck/create", {data: $scope.deck}).success(function(xhr) {
            $log.log("success creating deck: " + angular.toJson(xhr));
        }).error(function(xhr) {
            $log.log("error creating deck: " + angular.toJson(xhr));
        });
    }

    $scope.getDecks = function() {
        $http.get("/decks/all", {}).success(function(xhr) {
            $log.log("success retrieving decks: " + angular.toJson(xhr));
            for (var i = 0; i < xhr.length; i++) {
                var cards = xhr[i].cards;
                for (var j = 0; j < cards.length; j++) {
                    var cardName = cards[j].name.toUpperCase();
                    while (cardName.indexOf(" ") > 0) {
                        cardName = cardName.replace(" ", "_");
                    }
                    cardName += ".jpg";
                    cards[j].image = "/mtgImages/" + cardName;
                }
            }
            $scope.decks = xhr;
        }).error(function(xhr) {
            $log.log("error creating deck: " + angular.toJson(xhr));
        });
    }

}