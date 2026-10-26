"""
Ajoute un identifiant public (UUID) aux conversations.

Trois étapes, car les conversations existantes n'ont pas encore d'identifiant :
1. ajouter la colonne, vide ;
2. donner un UUID différent à chaque conversation existante ;
3. rendre la colonne obligatoire et unique.
"""
import uuid

from django.db import migrations, models


def generer_identifiants(apps, schema_editor):
    Conversation = apps.get_model('chatbot', 'Conversation')
    for conversation in Conversation.objects.filter(public_id__isnull=True).only('id'):
        conversation.public_id = uuid.uuid4()
        conversation.save(update_fields=['public_id'])


class Migration(migrations.Migration):

    # Hors transaction : PostgreSQL refuse de modifier une table dans la même
    # transaction que des mises à jour de lignes liées par clé étrangère.
    atomic = False

    dependencies = [
        ('chatbot', '0005_conversation_user_email_conversation_user_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='conversation',
            name='public_id',
            field=models.UUIDField(null=True, editable=False),
        ),
        migrations.RunPython(generer_identifiants, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='conversation',
            name='public_id',
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True),
        ),
    ]