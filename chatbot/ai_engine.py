def get_bot_response(message_content, tenant):
    """
    Version améliorée : recherche stricte dans la base de connaissance
    """
    # Récupérer la base de connaissance du tenant
    knowledge_items = tenant.knowledge_items.all()
    
    # Convertir le message en minuscules pour la recherche
    message_lower = message_content.lower().strip()
    
    # Nettoyer le message des mots vides
    stop_words = ['le', 'la', 'les', 'un', 'une', 'des', 'est', 'sont', 'pour', 'dans', 'sur', 'avec', 'ce', 'cet', 'cette']
    message_words = [w for w in message_lower.split() if w not in stop_words and len(w) > 2]
    
    best_match = None
    best_score = 0
    
    for item in knowledge_items:
        if item.question:
            question_lower = item.question.lower()
            question_words = [w for w in question_lower.split() if w not in stop_words and len(w) > 2]
            
            # Vérifier si la question est exactement dans le message
            if question_lower in message_lower:
                return item.answer, True
            
            # Compter les mots communs
            common_words = set(question_words).intersection(set(message_words))
            score = len(common_words)
            
            # Calculer le pourcentage de correspondance
            if question_words:
                match_percentage = score / len(question_words)
            else:
                match_percentage = 0
            
            # Match si au moins 60% des mots de la question correspondent
            if match_percentage >= 0.6 and score > best_score:
                best_score = score
                best_match = item
    
    if best_match:
        return best_match.answer, True
    
    # Si aucun match trouvé
    return None, False