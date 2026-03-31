def get_bot_response(message_content, tenant):
    """
    Version mock : recherche dans la base de connaissance
    (à remplacer par Claude API plus tard)
    """
    # Récupérer la base de connaissance du tenant
    knowledge_items = tenant.knowledge_items.all()
    
    # Convertir le message en minuscules pour la recherche
    message_lower = message_content.lower()
    
    # Chercher une FAQ correspondante
    for item in knowledge_items:
        if item.question:
            question_lower = item.question.lower()
            # Vérifier si la question est dans le message ou vice-versa
            if question_lower in message_lower or any(word in message_lower for word in question_lower.split()[:3]):
                return item.answer, True
    
    # Si aucune FAQ ne correspond
    fallback_message = "Je ne peux pas répondre à cette question pour le moment. Un agent va prendre le relais."
    return fallback_message, False