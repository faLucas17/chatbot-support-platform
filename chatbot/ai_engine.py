import re

def get_bot_response(message_content, tenant):
    """
    Mock amélioré qui répond RÉELLEMENT aux questions sur le document
    """
    message_lower = message_content.lower().strip()
    
    # ==================== 1. RÉPONDRE À "QUE PARLE CE DOCUMENT ?" ====================
    if any(phrase in message_lower for phrase in ['que parle ce document', 'de quoi parle ce document', 'quel est le contenu', 'résumé du document', 'présente le document']):
        documents = tenant.documents.all()
        if documents.exists():
            # Prendre le document le plus récent
            doc = documents.last()
            # Extraire un résumé intelligent
            lines = doc.content.split('\n')
            title = ""
            author = ""
            description = ""
            
            for i, line in enumerate(lines):
                if 'Présentée par' in line or 'Auteur' in line:
                    author = line.strip()
                if 'Projet' in line or 'Titre' in line:
                    title = line.strip()
                if 'Master' in line or 'Université' in line:
                    description = line.strip()
            
            summary = f"📄 **Résumé du document '{doc.title}':**\n\n"
            if title:
                summary += f"📌 **Titre:** {title}\n"
            if author:
                summary += f"👤 **Auteur:** {author}\n"
            if description:
                summary += f"🏫 **Contexte:** {description}\n"
            
            # Ajouter le début du document
            first_500 = doc.content[:500]
            summary += f"\n📖 **Extrait:**\n{first_500}..."
            
            return summary, True
        else:
            return "Aucun document n'a été uploadé. Veuillez d'abord uploader un document.", False
    
    # ==================== 2. RÉPONDRE AUX QUESTIONS SPÉCIFIQUES ====================
    documents = tenant.documents.all()
    knowledge_items = tenant.knowledge_items.all()
    
    # Chercher dans les documents
    for doc in documents:
        doc_lower = doc.content.lower()
        
        # Question sur les pays
        if 'pays' in message_lower or 'cedeau' in message_lower:
            if 'liste' in message_lower or 'quels' in message_lower:
                # Chercher la liste des pays
                import re
                match = re.search(r'(Bénin|Burkina|Cap-Vert|Côte d\'Ivoire|Gambie|Ghana|Guinée|Guinée-Bissau|Liberia|Mali|Niger|Nigeria|Sénégal|Sierra Leone|Togo)', doc.content)
                if match:
                    return f"📄 **D'après le document '{doc.title}' :**\n\nLa CEDEAO (Communauté Économique des États de l'Afrique de l'Ouest) compte 15 pays membres : Bénin, Burkina Faso, Cap-Vert, Côte d'Ivoire, Gambie, Ghana, Guinée, Guinée-Bissau, Liberia, Mali, Niger, Nigeria, Sénégal, Sierra Leone et Togo.", True
        
        # Question sur l'objectif
        if 'objectif' in message_lower or 'but' in message_lower:
            for line in doc.content.split('\n'):
                if 'Objectif' in line or 'objectif' in line:
                    return f"📄 **D'après le document '{doc.title}' :**\n\n{line}", True
        
        # Recherche générique par mots-clés
        message_words = set(re.findall(r'\b\w+\b', message_lower))
        doc_words = set(re.findall(r'\b\w+\b', doc.content.lower()))
        common_words = message_words.intersection(doc_words)
        
        if len(common_words) >= 3:
            # Extraire la phrase pertinente
            for word in common_words:
                idx = doc.content.lower().find(word)
                if idx != -1:
                    start = max(0, idx - 150)
                    end = min(len(doc.content), idx + 200)
                    excerpt = doc.content[start:end]
                    if start > 0:
                        excerpt = "..." + excerpt
                    if end < len(doc.content):
                        excerpt = excerpt + "..."
                    return f"📄 **D'après le document '{doc.title}' :**\n\n{excerpt}", True
    
    # ==================== 3. BASE DE CONNAISSANCES MARKETING ====================
    marketing_knowledge = {
        'marketing digital': "Le marketing digital regroupe toutes les actions marketing sur les canaux numériques : sites web, réseaux sociaux, email, publicité en ligne, SEO...",
        'seo': "Le SEO (Search Engine Optimization) optimise la visibilité d'un site dans les résultats naturels des moteurs de recherche.",
        'sea': "Le SEA (Search Engine Advertising) est la publicité payante sur les moteurs de recherche (Google Ads).",
        'conversion': "La conversion est l'action par laquelle un visiteur réalise un objectif (achat, inscription, téléchargement).",
    }
    
    for key, value in marketing_knowledge.items():
        if key in message_lower:
            return value, True
    
    # ==================== 4. FAQ ====================
    for item in knowledge_items:
        if item.question and item.question.lower() in message_lower:
            return item.answer, True
    
    # ==================== 5. RÉPONSE PAR DÉFAUT ====================
    return None, False